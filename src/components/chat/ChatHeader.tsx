import { ArrowLeft, MoreVertical, Phone, Video, History } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { ConversationListItemDto } from "../../types";
import { useIsOnline } from "../../store/presence.selectors";
import { Image as ImageIcon } from "lucide-react";
import { useCallActions } from "../../hooks/useCallActions";

interface ChatHeaderProps {
  conversation: ConversationListItemDto | undefined;
  isMobile: boolean;
  typingLabel: string | null;
  onMediaClick?: () => void;
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
        : "Offline";

  const { initiateCall } = useCallActions();
  const navigate = useNavigate();

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#273244] bg-[#101620] px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        {isMobile ? (
          <Link
            to="/chat"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}

        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2247] text-sm font-semibold text-[#c4b5fd]">
            {initials}
          </div>
          {isDirectOnline ? (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#101620] bg-[#10b981]" />
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{name}</p>
          <p className="truncate text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-300">
        {onMediaClick ? (
          <button
            type="button"
            onClick={onMediaClick}
            className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10"
            title="View media"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
        ) : null}
        {conversation?.type === "direct" && (
          <>
            <button
              type="button"
              onClick={() => navigate("/calls")}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10"
              title="Call history"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/5"
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
              <Phone className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/5"
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
              <Video className="h-5 w-5" />
            </button>
          </>
        )}

        <button type="button" className="rounded-xl p-2 hover:bg-white/5">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
