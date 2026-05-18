import { useCallback, useEffect, useRef } from "react";
import { socketService } from "../services/socket.service";
import {
  useHasMoreMessages,
  useMessageActions,
  useMessageIds,
  useMessagesError,
  useMessagesLoading,
} from "../store/message.selectors";

import { useAuthUser } from "../store/auth.selectors";
import { useConversationActions } from "../store/conversation.selectors";

export function useMessages(conversationId: string | undefined) {
  const safeConversationId = conversationId ?? "";
  const ids = useMessageIds(safeConversationId);
  const isLoading = useMessagesLoading(safeConversationId);
  const hasMore = useHasMoreMessages(safeConversationId);
  const error = useMessagesError(safeConversationId);
  const currentUser = useAuthUser();

  const { fetchMessages } = useMessageActions();
  const { updateUnreadCount } = useConversationActions();

  const hasFetchedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!conversationId) return;
    if (hasFetchedRef.current[conversationId]) return;

    hasFetchedRef.current[conversationId] = true;
    void fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  const oldestMessageId = ids[0];
  const newestMessageId = ids[ids.length - 1];

  const loadOlder = useCallback(async () => {
    if (!conversationId || !oldestMessageId || isLoading || !hasMore) return;

    await fetchMessages(conversationId, oldestMessageId);
  }, [conversationId, fetchMessages, hasMore, isLoading, oldestMessageId]);

  const markVisibleMessagesDelivered = useCallback(
    (messageIds: string[]) => {
      if (!conversationId || messageIds.length === 0) return;

      const socket = socketService.getSocket();
      if (!socket) return;

      socket.emit("messages_delivered", {
        conversationId,
        messageIds,
      });
    },
    [conversationId],
  );

  const markConversationRead = useCallback(() => {
    if (!conversationId || !newestMessageId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit("messages_read", {
      conversationId,
      lastSeenMessageId: newestMessageId,
    });
    updateUnreadCount(conversationId, 0);
  }, [conversationId, newestMessageId, updateUnreadCount]);

  return {
    ids,
    isLoading,
    hasMore,
    error,
    currentUserId: currentUser?.id ?? null,
    loadOlder,
    markVisibleMessagesDelivered,
    markConversationRead,
  };
}
