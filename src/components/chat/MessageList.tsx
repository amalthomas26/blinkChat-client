import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MessageDto, OptimisticMessageDto } from "../../types";
import { buildMessageRows } from "../../lib/messageRows";
import { DateSeparator } from "./DateSeparator";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import {
  useMessage,
  useMessageIds,
  useReadCursor,
} from "../../store/message.selectors";
import { useMessageStore } from "../../store/message.store";

import type { ConversationListUserDto } from "../../types";

interface MessageListProps {
  conversationId: string;
  currentUserId: string | null;
  participants: ConversationListUserDto[];
  typingLabel: string | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadOlder: () => Promise<void>;
  onRetry: (message: OptimisticMessageDto) => void;
  onContextMenuOpen: (messageId: string, x: number, y: number) => void;
  onAtBottomChange: (isAtBottom: boolean) => void;
  onMarkRead: () => void;
  onReactionToggle: (messageId: string, emoji: string) => void;
  onImageClick?: (src: string) => void;
  highlightedMessageId?: string | null;
}

const MessageRow = memo(function MessageRow({
  messageId,
  currentUserId,
  participants,
  readCursor,
  onRetry,
  onContextMenuOpen,
  onReactionToggle,
  onImageClick,
  isHighlighted,
}: {
  messageId: string;
  currentUserId: string | null;
  participants: ConversationListUserDto[];
  readCursor: string | null;
  onRetry: (message: OptimisticMessageDto) => void;
  onContextMenuOpen: (messageId: string, x: number, y: number) => void;
  onReactionToggle: (messageId: string, emoji: string) => void;
  onImageClick?: (src: string) => void;
  isHighlighted?: boolean;
}) {
  const message = useMessage(messageId);

  if (!message) return null;

  const isOwn = message.senderId === currentUserId;
  const isRead = Boolean(readCursor && message._id <= readCursor);

  return (
    <MessageBubble
      message={message}
      isOwn={isOwn}
      isRead={isRead}
      currentUserId={currentUserId}
      participants={participants}
      onRetry={onRetry}
      onContextMenuOpen={onContextMenuOpen}
      onReactionToggle={onReactionToggle}
      onImageClick={onImageClick}
      isHighlighted={isHighlighted}
    />
  );
});

export function MessageList({
  conversationId,
  currentUserId,
  participants,
  typingLabel,
  hasMore,
  isLoading,
  onLoadOlder,
  onRetry,
  onContextMenuOpen,
  onAtBottomChange,
  onMarkRead,
  onReactionToggle,
  onImageClick,
  highlightedMessageId,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [showNewMessages, setShowNewMessages] = useState(false);

  const messageIds = useMessageIds(conversationId);
  const readCursor = useReadCursor(conversationId);

  const rows = useMemo(() => {
    const state = useMessageStore.getState();
    const messages = messageIds
      .map((id) => state.byId[id])
      .filter((msg): msg is MessageDto | OptimisticMessageDto => Boolean(msg));
    return buildMessageRows(messages);
  }, [messageIds]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => rows[index].id,
    estimateSize: (index) => (rows[index].type === "date" ? 42 : 92),
    overscan: 12,
  });

  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  const isAtBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return true;

    return node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback(() => {
    virtualizerRef.current.scrollToIndex(rows.length - 1, { align: "end" });
    setShowNewMessages(false);
    onMarkRead();
  }, [onMarkRead, rows.length]);

  useEffect(() => {
    if (rows.length === 0) return;

    if (isAtBottom()) {
      requestAnimationFrame(scrollToBottom);
      return;
    }

    setShowNewMessages(true);
  }, [isAtBottom, rows.length, scrollToBottom]);

  // Scroll to highlighted message when search result changes
  useEffect(() => {
    if (!highlightedMessageId) return;
    const idx = rows.findIndex(
      (r) => r.type === "message" && r.messageId === highlightedMessageId,
    );
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "center" });
    }
  }, [highlightedMessageId, rows, virtualizer]);

  const scrollRAFRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (scrollRAFRef.current !== null) return;
    scrollRAFRef.current = requestAnimationFrame(async () => {
      scrollRAFRef.current = null;
      const node = scrollRef.current;
      if (!node) return;

      const bottom = isAtBottom();
      onAtBottomChange(bottom);

      if (bottom) {
        setShowNewMessages(false);
        onMarkRead();
      }

      if (node.scrollTop < 80 && hasMore && !isLoading) {
        const previousHeight = node.scrollHeight;
        const previousTop = node.scrollTop;

        await onLoadOlder();

        requestAnimationFrame(() => {
          const nextNode = scrollRef.current;
          if (!nextNode) return;

          const heightDelta = nextNode.scrollHeight - previousHeight;
          nextNode.scrollTop = previousTop + heightDelta;
        });
      }
    });
  };

  if (rows.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
        No messages yet. Start the conversation.
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-[#0b1017] px-1 py-4"
      >
        {isLoading && rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading messages...
          </div>
        ) : null}

        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.type === "date" ? (
                  <DateSeparator date={row.date} />
                ) : (
                  <MessageRow
                    messageId={row.messageId}
                    currentUserId={currentUserId}
                    participants={participants}
                    readCursor={readCursor}
                    onRetry={onRetry}
                    onContextMenuOpen={onContextMenuOpen}
                    onReactionToggle={onReactionToggle}
                    onImageClick={onImageClick}
                    isHighlighted={row.messageId === highlightedMessageId}
                  />
                )}
              </div>
            );
          })}
        </div>

        {typingLabel ? <TypingIndicator label={typingLabel} /> : null}
      </div>

      {showNewMessages ? (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          New messages ↓
        </button>
      ) : null}
    </div>
  );
}
