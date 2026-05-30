import { useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  History,
  Search,
  Image as ImageIcon,
} from "../ui/icons";
import { Link, useNavigate } from "react-router-dom";
import type { ConversationListItemDto } from "../../types";
import { useIsOnline } from "../../store/presence.selectors";
import { useCallActions } from "../../hooks/useCallActions";
import { ChatOptionsMenu } from "./ChatOptionsMenu";
import { formatLastSeen } from "../../lib/date";

interface ChatHeaderProps {
  conversation: ConversationListItemDto | undefined;
  isMobile: boolean;
  typingLabel: string | null;
  onMediaClick?: () => void;
  onMuteToggle?: () => void;
  onPinToggle?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onGroupInfo?: () => void;
  onSearchOpen?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ChatHeader({
  conversation,
  isMobile,
  typingLabel,
  onMediaClick,
  onMuteToggle,
  onPinToggle,
  onClearChat,
  onDeleteChat,
  onGroupInfo,
  onSearchOpen,
}: ChatHeaderProps) {
  const peerId = conversation?.peer?.id ?? "";
  const liveOnline = useIsOnline(peerId);

  const name = conversation?.name ?? "Loading conversation...";
  const initials = getInitials(name || "C");

  // Only use the live presence store — NOT the DTO's static peer.status.
  const isDirectOnline = conversation?.type === "direct" && liveOnline;

  const subtitle = typingLabel
    ? typingLabel
    : isDirectOnline
      ? "Online"
      : conversation?.type === "group"
        ? `${conversation.participants.length} members`
        : conversation?.peer?.lastSeen
          ? formatLastSeen(conversation.peer.lastSeen)
          : "Offline";

  const { initiateCall } = useCallActions();
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);

  const avatarUrl =
    conversation?.type === "direct"
      ? conversation.peer?.avatar
      : conversation?.groupAvatar;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#273244] bg-[#101620] px-3 md:h-20 md:px-6">

      {/* Left: back + avatar + name + subtitle */}
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        {isMobile ? (
          <Link
            to="/chat"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}

        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 rounded-full border border-white/10 object-cover md:h-12 md:w-12"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd] md:h-12 md:w-12">
              {initials}
            </div>
          )}
          {isDirectOnline ? (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#101620] bg-[#10b981] md:h-3.5 md:w-3.5" />
          ) : null}
        </div>

        {/* Name + subtitle stacked */}
        <button
          type="button"
          onClick={() => {
            if (conversation?.type === "group") {
              navigate(`/chat/${conversation.id}/info`);
            } else if (conversation?.type === "direct" && conversation.peer) {
              navigate(`/user/${conversation.peer.id}`);
            }
          }}
          className="min-w-0 text-left"
        >
          <p className="truncate text-sm font-semibold text-white md:text-lg">{name}</p>
          <p className="truncate text-xs text-slate-400 md:text-sm">{subtitle}</p>
        </button>
      </div>

      {/* Right: action icons — compact on mobile */}
      <div className="flex shrink-0 items-center gap-0 text-slate-300 md:gap-1">
        {onSearchOpen ? (
          <button
            type="button"
            onClick={onSearchOpen}
            className="rounded-xl p-1 transition hover:bg-white/10 md:p-2"
            title="Search messages"
          >
            <Search className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        ) : null}
        {onMediaClick ? (
          <button
            type="button"
            onClick={onMediaClick}
            className="rounded-xl p-1 transition hover:bg-white/10 md:p-2"
            title="View media"
          >
            <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        ) : null}
        {conversation?.type === "direct" && (
          <>
            <button
              type="button"
              onClick={() => navigate("/calls")}
              className="rounded-xl p-1 transition hover:bg-white/10 md:p-2"
              title="Call history"
            >
              <History className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              type="button"
              className="rounded-xl p-1 hover:bg-white/5 md:p-2"
              title="Voice call"
              onClick={() => {
                if (conversation?.peer) {
                  initiateCall(
                    conversation.peer.id,
                    conversation.peer.name,
                    conversation.peer.avatar,
                    "audio",
                  );
                }
              }}
            >
              <Phone className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              type="button"
              className="rounded-xl p-1 hover:bg-white/5 md:p-2"
              title="Video call"
              onClick={() => {
                if (conversation?.peer) {
                  initiateCall(
                    conversation.peer.id,
                    conversation.peer.name,
                    conversation.peer.avatar,
                    "video",
                  );
                }
              }}
            >
              <Video className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="rounded-xl p-1 hover:bg-white/5 md:p-2"
          >
            <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          {showOptions && conversation ? (
            <ChatOptionsMenu
              conversation={conversation}
              onMuteToggle={onMuteToggle || (() => {})}
              onPinToggle={onPinToggle || (() => {})}
              onClearChat={onClearChat || (() => {})}
              onDeleteChat={onDeleteChat || (() => {})}
              onGroupInfo={conversation.type === "group" ? onGroupInfo : undefined}
              onClose={() => setShowOptions(false)}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
