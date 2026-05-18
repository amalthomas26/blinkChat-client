import { useCallback, useEffect, useRef } from "react";
import {
  useConversationActions,
  useConversationList,
  useConversationsError,
  useConversationsHasNextPage,
  useConversationsLoading,
  useConversationsNextCursor,
} from "../store/conversation.selectors";

export function useConversations() {
  const conversations = useConversationList();
  const isLoading = useConversationsLoading();
  const error = useConversationsError();
  const hasNextPage = useConversationsHasNextPage();
  const nextCursor = useConversationsNextCursor();
  const { fetchConversations } = useConversationActions();

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || conversations.length > 0) return;
    hasFetchedRef.current = true;
    void fetchConversations();
  }, [fetchConversations, conversations.length]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || !nextCursor || isLoading) return;
    void fetchConversations(nextCursor);
  }, [fetchConversations, hasNextPage, isLoading, nextCursor]);

  const retry = useCallback(() => {
    void fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    isInitialLoading: isLoading && conversations.length === 0,
    error,
    hasNextPage,
    loadMore,
    retry,
  };
}
