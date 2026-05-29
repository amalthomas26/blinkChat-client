import { useEffect, useRef } from "react";
import { BellOff, Bell, Pin, PinOff, Trash2, Info, Eraser } from "../ui/icons";
import type { ConversationListItemDto } from "../../types";

interface ChatOptionsMenuProps {
  conversation: ConversationListItemDto;
  onMuteToggle: () => void;
  onPinToggle: () => void;
  /** Called for direct chats — full server delete */
  onDeleteChat: () => void;
  /** Called for groups — frontend-only clear */
  onClearChat: () => void;
  onGroupInfo?: () => void;
  onClose: () => void;
}

export function ChatOptionsMenu({
  conversation,
  onMuteToggle,
  onPinToggle,
  onDeleteChat,
  onClearChat,
  onGroupInfo,
  onClose,
}: ChatOptionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const isGroup = conversation.type === "group";

  const items: {
    label: string;
    icon: typeof Bell;
    onClick: () => void;
    danger?: boolean;
  }[] = [];

  if (isGroup && onGroupInfo) {
    items.push({ label: "Group Info", icon: Info, onClick: onGroupInfo });
  }

  items.push({
    label: conversation.isMuted ? "Unmute" : "Mute",
    icon: conversation.isMuted ? Bell : BellOff,
    onClick: onMuteToggle,
  });

  items.push({
    label: conversation.isPinned ? "Unpin Chat" : "Pin Chat",
    icon: conversation.isPinned ? PinOff : Pin,
    onClick: onPinToggle,
  });

  // Groups: "Clear Chat" (frontend only). Direct: "Delete Chat" (server delete).
  if (isGroup) {
    items.push({
      label: "Clear Chat",
      icon: Eraser,
      onClick: onClearChat,
      danger: true,
    });
  } else {
    items.push({
      label: "Delete Chat",
      icon: Trash2,
      onClick: onDeleteChat,
      danger: true,
    });
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-1 min-w-[168px] overflow-hidden rounded-xl border border-[#273244] bg-[#1d2635] py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
            item.danger
              ? "text-rose-400 hover:bg-rose-950/30"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
