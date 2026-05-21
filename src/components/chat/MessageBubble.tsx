import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { Check, CheckCheck, RotateCcw } from "lucide-react";
import type { MessageDto, OptimisticMessageDto } from "../../types";
import type { ConversationListUserDto } from "../../types";
import { MessageType } from "../../types";
import { cn } from "../../lib/utils";
import { formatMessageTime } from "../../lib/date";
import { UploadProgressBadge } from "./UploadProgressBadge";
import { AudioMessage } from "./AudioMessage";
import { VideoMessage } from "./VideoMessage";
import { FileMessage } from "./FileMessage";
import { CallMessage } from "./CallMessage";

const MAX_VISIBLE_REACTIONS = 5;

interface MessageBubbleProps {
  message: MessageDto | OptimisticMessageDto;
  isOwn: boolean;
  isRead: boolean;
  currentUserId: string | null;
  participants: ConversationListUserDto[];
  onRetry: (message: OptimisticMessageDto) => void;
  onContextMenuOpen: (messageId: string, x: number, y: number) => void;
  onReactionToggle: (messageId: string, emoji: string) => void;
  onImageClick?: (src: string) => void;
}

function isOptimisticMessage(
  message: MessageDto | OptimisticMessageDto,
): message is OptimisticMessageDto {
  return "status" in message;
}

function MessageStatusIcon({
  message,
  isRead,
}: {
  message: MessageDto | OptimisticMessageDto;
  isRead: boolean;
}) {
  if (isOptimisticMessage(message)) {
    if (message.status === "pending") {
      return <span className="text-xs text-slate-400">...</span>;
    }
    return null;
  }
  if (isRead) {
    return <CheckCheck className="h-4 w-4 text-[#00ff00]" />;
  }
  if (message.deliveredTo.length > 1) {
    return <CheckCheck className="h-4 w-4 text-slate-400" />;
  }

  return <Check className="h-4 w-4 text-slate-400" />;
}

function ImageContent({
  src,
  localPreviewUrl,
  onImageClick,
}: {
  src: string;
  localPreviewUrl?: string;
  onImageClick?: (src: string) => void;
}) {
  // Keep track of the last successfully displayed URL so we never show
  // a blank frame. On the optimistic→confirmed transition, the blob URL
  // acts as a placeholder until the Cloudinary URL finishes loading.
  const [displaySrc, setDisplaySrc] = useState<string>(localPreviewUrl ?? src);

  // When the confirmed (Cloudinary) src arrives, pre-load it invisibly
  // and only swap displaySrc once it's ready — zero flash.
  useEffect(() => {
    if (src === displaySrc) return;
    const img = new window.Image();
    img.src = src;
    img.onload = () => setDisplaySrc(src);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(() => {
    if (!src.startsWith("blob:") && onImageClick) onImageClick(src);
  }, [src, onImageClick]);

  return (
    <img
      src={displaySrc}
      alt="Image"
      className="max-h-80 w-full cursor-pointer rounded-xl object-cover"
      onClick={handleClick}
    />
  );
}

function MessageContent({
  message,
  onImageClick,
}: {
  message: MessageDto | OptimisticMessageDto;
  onImageClick?: (src: string) => void;
}) {
  if (message.type === MessageType.IMAGE && message.mediaUrl) {
    return (
      // Wrapper so the caption sits below the image inside the same bubble
      <div className="flex flex-col gap-1">
        <ImageContent
          src={message.mediaUrl}
          localPreviewUrl={
            isOptimisticMessage(message) ? message.localPreviewUrl : undefined
          }
          onImageClick={onImageClick}
        />
        {message.content ? (
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </p>
        ) : null}
      </div>
    );
  }
  if (message.type === MessageType.AUDIO && message.mediaUrl) {
    return (
      <AudioMessage src={message.mediaUrl} duration={message.audioDuration} />
    );
  }

  if (message.type === MessageType.VIDEO && message.mediaUrl) {
    return <VideoMessage src={message.mediaUrl} caption={message.content} />;
  }

  if (message.type === MessageType.FILE && message.mediaUrl) {
    return (
      <FileMessage
        href={message.mediaUrl}
        fileName={message.fileName}
        fileSize={message.fileSize}
      />
    );
  }

  return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
}

function MessageBubbleComponent({
  message,
  isOwn,
  isRead,
  currentUserId,
  participants,
  onRetry,
  onContextMenuOpen,
  onReactionToggle,
  onImageClick,
}: MessageBubbleProps) {
  // Call log messages render as centered system items, not bubbles
  if (message.type === MessageType.CALL) {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <CallMessage message={message as MessageDto} isOwn={isOwn} />
      </div>
    );
  }

  // Build grouped reactions: emoji → { count, reactorIds }
  const groupedReactions = useMemo(() => {
    const groups = new Map<string, { count: number; reactorIds: string[] }>();

    for (const reaction of message.reactions ?? []) {
      const existing = groups.get(reaction.emoji);
      if (existing) {
        existing.count += 1;
        existing.reactorIds.push(reaction.userId);
      } else {
        groups.set(reaction.emoji, { count: 1, reactorIds: [reaction.userId] });
      }
    }

    return Array.from(groups.entries()); // [emoji, { count, reactorIds }][]
  }, [message.reactions]);

  // Build a userId → name lookup from participants for tooltips
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      map.set(p.id, p.name);
    }
    return map;
  }, [participants]);

  const visibleReactions = groupedReactions.slice(0, MAX_VISIBLE_REACTIONS);
  const overflowCount = groupedReactions.length - visibleReactions.length;

  const failed = isOptimisticMessage(message) && message.status === "failed";

  return (
    <div
      className={cn("flex px-4 py-1", isOwn ? "justify-end" : "justify-start")}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenuOpen(message._id, event.clientX, event.clientY);
      }}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm md:max-w-[62%] select-none md:select-auto",
          isOwn
            ? "rounded-br-md bg-[#2a1f4e] text-white"
            : "rounded-bl-md bg-[#1a202b] text-white",
          failed && "border border-rose-400/60",
        )}
        style={{ WebkitTouchCallout: "none" }}
      >
        {message.forwardedFrom ? (
          <p className="mb-1 text-xs font-medium text-slate-400">Forwarded</p>
        ) : null}

        {message.replyToSnapshot ? (
          <div className="mb-2 rounded-xl border-l-2 border-[#8b5cf6] bg-black/20 px-3 py-2 text-xs text-slate-300">
            {message.replyToSnapshot.content ??
              message.replyToSnapshot.type.toUpperCase()}
          </div>
        ) : null}

        <MessageContent message={message} onImageClick={onImageClick} />

        {isOptimisticMessage(message) && message.uploadId ? (
          <UploadProgressBadge uploadId={message.uploadId} />
        ) : null}

        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-400">
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn ? (
            <MessageStatusIcon message={message} isRead={isRead} />
          ) : null}
        </div>

        {visibleReactions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {visibleReactions.map(([emoji, { count, reactorIds }]) => {
              const isMine = currentUserId
                ? reactorIds.includes(currentUserId)
                : false;

              // Build tooltip text: "You, Alice, Bob" (cap at 5 names)
              const names = reactorIds
                .slice(0, 5)
                .map((uid) =>
                  uid === currentUserId
                    ? "You"
                    : (participantMap.get(uid) ?? "Unknown"),
                );
              const tooltipText =
                names.join(", ") +
                (reactorIds.length > 5
                  ? ` +${reactorIds.length - 5} more`
                  : "");

              return (
                <div key={emoji} className="group/reaction relative">
                  <button
                    type="button"
                    onClick={() => onReactionToggle(message._id, emoji)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                      isMine
                        ? "border-[#8b5cf6] bg-[#2a1f4e] text-white hover:bg-[#351f6e]"
                        : "border-white/10 bg-black/20 text-white hover:border-white/30 hover:bg-black/40",
                    )}
                    title={tooltipText}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </button>

                  {/* Hover tooltip showing reactor names */}
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#273244] bg-[#151b2b] px-2.5 py-1.5 text-xs text-slate-200 shadow-xl",
                      "opacity-0 transition-opacity duration-150 group-hover/reaction:opacity-100",
                    )}
                  >
                    {tooltipText}
                    {/* Tooltip arrow */}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#273244]" />
                  </div>
                </div>
              );
            })}

            {overflowCount > 0 ? (
              <span className="flex items-center rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-400">
                +{overflowCount} more
              </span>
            ) : null}
          </div>
        ) : null}

        {failed && isOptimisticMessage(message) ? (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

