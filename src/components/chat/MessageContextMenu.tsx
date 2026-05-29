import { CornerUpLeft, Forward, Trash2, Copy, Plus } from "../ui/icons";
import { useRef, useState, useEffect } from "react";
import { ReactionPicker } from "./ReactionPicker";

export type MessageAction = "reply" | "forward" | "copy" | "delete" | `react:${string}`;

interface MessageContextMenuProps {
  x: number;
  y: number;
  canDelete: boolean;
  canCopy: boolean;
  onAction: (action: MessageAction) => void;
  onClose: () => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"]; // 5 emojis so there's room for the + button

export function MessageContextMenu({
  x,
  y,
  canDelete,
  canCopy,
  onAction,
  onClose,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y, opacity: 0 });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (!menuRef.current) return;
    
    const updatePosition = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      const padding = 16;
      
      let left = x;
      let top = y;

      if (left + rect.width > window.innerWidth - padding) {
        left = window.innerWidth - rect.width - padding;
      }
      if (left < padding) left = padding;

      if (top + rect.height > window.innerHeight - padding) {
        top = window.innerHeight - rect.height - padding;
      }
      if (top < padding) top = padding;

      setPosition({ left, top, opacity: 1 });
    };

    updatePosition();
    
    const observer = new ResizeObserver(updatePosition);
    observer.observe(menuRef.current);
    
    return () => observer.disconnect();
  }, [x, y, isPickerOpen]);

  const actions: Array<{
    id: MessageAction;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hidden?: boolean;
  }> = [
    { id: "reply", label: "Reply", icon: CornerUpLeft },
    { id: "copy", label: "Copy", icon: Copy, hidden: !canCopy },
    { id: "forward", label: "Forward", icon: Forward },
    { id: "delete", label: "Delete", icon: Trash2, hidden: !canDelete },
  ];

  if (isPickerOpen) {
    return (
      <>
        <button
          type="button"
          aria-label="Close message menu"
          className="fixed inset-0 z-40 cursor-default"
          onClick={onClose}
        />
        <div
          ref={menuRef}
          className="fixed z-50 flex flex-col overflow-hidden transition-opacity duration-100"
          style={{ left: position.left, top: position.top, opacity: position.opacity }}
        >
          <ReactionPicker
            onSelect={(emoji) => onAction(`react:${emoji}`)}
            onClose={onClose}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close message menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="fixed z-50 flex w-auto min-w-[200px] max-w-[280px] flex-col overflow-hidden rounded-2xl border border-[#273244] bg-[#151b2b] py-2 shadow-2xl transition-opacity duration-100"
        style={{ left: position.left, top: position.top, opacity: position.opacity }}
      >
        <div className="flex items-center justify-between gap-1 border-b border-[#273244] px-4 pb-2 pt-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-white/10 active:scale-95 transition-transform"
              onClick={() => onAction(`react:${emoji}`)}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              setIsPickerOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-1">
          {actions
            .filter((action) => !action.hidden)
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onAction(action.id)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-200 hover:bg-white/5 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {action.label}
                </button>
              );
            })}
        </div>
      </div>
    </>
  );
}
