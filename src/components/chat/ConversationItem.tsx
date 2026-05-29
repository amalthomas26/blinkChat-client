import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ConversationListItemDto } from "../../types";
import { cn } from "../../lib/utils";
import { useTypingUsers } from "../../store/conversation.selectors";
import { useIsOnline } from "../../store/presence.selectors";
import { Pin, BellOff } from "../ui/icons";

interface ConversationItemProps {
  conversation: ConversationListItemDto;
  isActive: boolean;
}

function formatConversationTime(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getPreview(conversation: ConversationListItemDto): string {
  const message = conversation.lastMessage;
  if (!message) return "No messages yet";

  switch (message.type) {
    case "image":
      return "Photo";
    case "audio":
      return "Voice message";
    case "video":
      return "Video";
    case "file":
      return message.fileName ?? "File";
    default:
      return message.content?.trim() || "Empty message";
  }
}

function ConversationItemComponent({
  conversation,
  isActive,
}: ConversationItemProps) {
  const navigate = useNavigate();
  const typingUsers = useTypingUsers(conversation.id);
  const peerId = conversation.peer?.id ?? "";
  const liveOnline = useIsOnline(peerId);

  const isDirect = conversation.type === "direct";
  // Only use the live presence store — NOT the DTO's static peer.status.
  // peer.status is a snapshot from the REST API and never updates in real-time.
  const isOnline = isDirect ? liveOnline : false;

  const displayName = conversation.name ?? "Unknown conversation";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const previewText = useMemo(() => {
    if (typingUsers.size > 0) return "Typing...";
    return getPreview(conversation);
  }, [conversation, typingUsers]);

  const previewClassName =
    typingUsers.size > 0 ? "text-[#a78bfa]" : "text-slate-400";

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${conversation.id}`)}
      className={cn(
        "flex w-full items-center gap-4 border-b border-[#1d2635] px-4 py-4 text-left transition-colors md:px-6",
        isActive ? "bg-white/5" : "hover:bg-white/[0.03]",
      )}
    >
      <div className="relative shrink-0">
        {(
          conversation.type === "direct"
            ? conversation.peer?.avatar
            : conversation.groupAvatar
        ) ? (
          <img
            src={
              (conversation.type === "direct"
                ? conversation.peer?.avatar
                : conversation.groupAvatar) ?? ""
            }
            alt={displayName}
            className="h-14 w-14 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2a2247] text-lg font-semibold text-[#8b5cf6]">
            {initials}
          </div>
        )}
        {isOnline ? (
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#151b2b] bg-[#10b981]" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xl font-semibold text-white">
            {displayName}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.isMuted ? (
              <BellOff className="h-3.5 w-3.5 text-slate-500" />
            ) : null}
            {conversation.isPinned ? (
              <Pin className="h-3.5 w-3.5 text-[#8b5cf6]" />
            ) : null}
            <span className="text-sm text-slate-500">
              {formatConversationTime(
                conversation.lastMessage?.createdAt ?? conversation.updatedAt,
              )}
            </span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className={cn("truncate text-sm", previewClassName)}>
            {previewText}
          </p>

          {conversation.unread.unreadCount > 0 ? (
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#8b5cf6] px-1.5 text-xs font-semibold text-white">
              {conversation.unread.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export const ConversationItem = memo(ConversationItemComponent);
