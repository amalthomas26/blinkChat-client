import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { Check, CheckCheck, RotateCcw, MoreHorizontal } from "../ui/icons";
import type { MessageDto, OptimisticMessageDto } from "../../types";
import type { ConversationListUserDto } from "../../types";
import { MessageType } from "../../types";
import { cn } from "../../lib/utils";
import { formatMessageTime } from "../../lib/date";
import { UploadProgressBadge } from "./UploadProgressBadge";
import { ReactionDetailPopover } from "./ReactionDetailPopover";
import { AudioMessage } from "./AudioMessage";
import { VideoMessage } from "./VideoMessage";
import { FileMessage } from "./FileMessage";
import { CallMessage } from "./CallMessage";

const MAX_VISIBLE_REACTIONS = 3;

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
  isHighlighted?: boolean;
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
  isHighlighted,
}: MessageBubbleProps) {
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [flashHighlight, setFlashHighlight] = useState(false);

  // Trigger flash animation when highlighted
  useEffect(() => {
    if (isHighlighted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlashHighlight(true);
      const timer = setTimeout(() => setFlashHighlight(false), 1500);
      return () => clearTimeout(timer);
    }
    setFlashHighlight(false);
  }, [isHighlighted]);

  // Build grouped reactions: emoji → { count, reactorIds }
  // Must be above early returns to satisfy rules-of-hooks
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

  // Call log messages render as centered system items, not bubbles
  if (message.type === MessageType.CALL) {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <CallMessage message={message as MessageDto} isOwn={isOwn} />
      </div>
    );
  }

  // System / event messages render as centred pills (group add, remove, promote…)
  if (message.type === MessageType.SYSTEM) {
    return (
      <div className="flex justify-center px-4 py-2">
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">
          {message.content}
        </span>
      </div>
    );
  }

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
          "max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm md:max-w-[62%] select-none md:select-auto transition-all duration-500",
          isOwn
            ? "rounded-br-md bg-[#2a1f4e] text-white"
            : "rounded-bl-md bg-[#1a202b] text-white",
          failed && "border border-rose-400/60",
          flashHighlight && "ring-2 ring-amber-400/70 bg-amber-900/20",
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

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReactionToggle(message._id, emoji)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    isMine
                      ? "border-[#8b5cf6] bg-[#2a1f4e] text-white hover:bg-[#351f6e]"
                      : "border-white/10 bg-black/20 text-white hover:border-white/30 hover:bg-black/40",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={(e) => {
                setPopoverAnchor(e.currentTarget.getBoundingClientRect());
              }}
              className="flex items-center rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-400 hover:bg-black/40 hover:text-white transition-colors"
            >
              {overflowCount > 0 ? `+${overflowCount} more` : <MoreHorizontal className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null}

        {popoverAnchor ? (
          <ReactionDetailPopover
            groups={groupedReactions.map(([emoji, { count, reactorIds }]) => ({
              emoji,
              count,
              reactors: reactorIds.map((id) => {
                const p = participants.find((p) => p.id === id);
                return {
                  id,
                  name: p?.name ?? "Unknown",
                  avatar: p?.avatar,
                };
              }),
            }))}
            anchorRect={popoverAnchor}
            currentUserId={currentUserId}
            onClose={() => setPopoverAnchor(null)}
          />
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

