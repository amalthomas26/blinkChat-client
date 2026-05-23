import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

export interface ReactionGroup {
  emoji: string;
  count: number;
  reactors: { id: string; name: string; avatar?: string }[];
}

interface ReactionDetailPopoverProps {
  groups: ReactionGroup[];
  initialEmoji?: string;
  anchorRect?: DOMRect;
  onClose: () => void;
  currentUserId: string | null;
}

export function ReactionDetailPopover({
  groups,
  initialEmoji,
  anchorRect,
  onClose,
  currentUserId,
}: ReactionDetailPopoverProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(
    initialEmoji ?? groups[0]?.emoji
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handler, true);
    document.addEventListener("keydown", keyHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("keydown", keyHandler, true);
    };
  }, [onClose]);

  const selectedGroup = groups.find((g) => g.emoji === selectedEmoji) ?? groups[0];

  const isMobile = window.innerWidth < 768;

  let style: React.CSSProperties = {};
  if (!isMobile && anchorRect) {
    const popoverWidth = 280;
    const popoverHeight = 320; 
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    let top = anchorRect.bottom + 8;

    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    
    // Simple top collision detection
    if (top + popoverHeight > window.innerHeight - 16) {
      top = anchorRect.top - popoverHeight - 8;
    }

    style = {
      position: "fixed",
      left,
      top,
      width: popoverWidth,
      maxHeight: popoverHeight,
    };
  }

  const content = (
    <div
      ref={ref}
      style={style}
      className={cn(
        "z-[9999] flex flex-col overflow-hidden bg-[#151b2b] shadow-2xl border border-[#273244]",
        isMobile
          ? "fixed bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl pb-safe"
          : "rounded-2xl"
      )}
    >
      {/* Header Tabs */}
      <div className="flex shrink-0 items-center overflow-x-auto border-b border-[#273244] px-2 pt-2 scrollbar-hide">
        {groups.map((g) => (
          <button
            key={g.emoji}
            onClick={() => setSelectedEmoji(g.emoji)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm transition-colors",
              selectedEmoji === g.emoji
                ? "border-[#8b5cf6] text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <span className="text-lg leading-none">{g.emoji}</span>
            <span className="font-semibold">{g.count}</span>
          </button>
        ))}
      </div>

      {/* Reactors List */}
      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: isMobile ? '50vh' : undefined }}>
        {selectedGroup.reactors.map((reactor) => {
          const initials = reactor.name.charAt(0).toUpperCase();
          const isYou = reactor.id === currentUserId;
          return (
            <div
              key={reactor.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              {reactor.avatar ? (
                <img
                  src={reactor.avatar}
                  alt={reactor.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a1f4e] text-sm font-medium text-[#c4b5fd]">
                  {initials}
                </div>
              )}
              <span className="text-sm font-medium text-slate-200">
                {isYou ? "You" : reactor.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <>
      {isMobile && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" />
      )}
      {content}
    </>,
    document.body
  );
}
