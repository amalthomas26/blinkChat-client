import { useState, useCallback, useRef, useEffect } from "react";
import { messageService } from "../services/message.service";
import type { MessageDto } from "../types";

export interface MessageSearchState {
  query: string;
  results: MessageDto[];
  currentIndex: number;
  totalCount: number;
  isSearching: boolean;
  hasMore: boolean;
}

export function useMessageSearch(conversationId: string | undefined) {
  const [state, setState] = useState<MessageSearchState>({
    query: "",
    results: [],
    currentIndex: -1,
    totalCount: 0,
    isSearching: false,
    hasMore: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      setState((s) => ({ ...s, query: q }));

      // Cancel previous requests
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 2 || !conversationId) {
        setState((s) => ({
          ...s,
          results: [],
          currentIndex: -1,
          totalCount: 0,
          isSearching: false,
          hasMore: false,
        }));
        return;
      }

      setState((s) => ({ ...s, isSearching: true }));

      debounceRef.current = setTimeout(async () => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
          const res = await messageService.searchMessages(
            conversationId,
            trimmed,
            { limit: 50 },
          );
          if (ctrl.signal.aborted) return;
          const messages = res.data ?? [];
          setState((s) => ({
            ...s,
            results: messages,
            totalCount: messages.length,
            currentIndex: messages.length > 0 ? 0 : -1,
            isSearching: false,
            hasMore: res.meta?.hasMore ?? false,
          }));
        } catch {
          if (!ctrl.signal.aborted) {
            setState((s) => ({
              ...s,
              results: [],
              currentIndex: -1,
              totalCount: 0,
              isSearching: false,
              hasMore: false,
            }));
          }
        }
      }, 300);
    },
    [conversationId],
  );

  const goToNext = useCallback(() => {
    setState((s) => {
      if (s.results.length === 0) return s;
      const next = (s.currentIndex + 1) % s.results.length;
      return { ...s, currentIndex: next };
    });
  }, []);

  const goToPrev = useCallback(() => {
    setState((s) => {
      if (s.results.length === 0) return s;
      const prev =
        s.currentIndex <= 0 ? s.results.length - 1 : s.currentIndex - 1;
      return { ...s, currentIndex: prev };
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState({
      query: "",
      results: [],
      currentIndex: -1,
      totalCount: 0,
      isSearching: false,
      hasMore: false,
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const currentMessageId =
    state.currentIndex >= 0 ? state.results[state.currentIndex]?._id : null;

  return {
    ...state,
    currentMessageId,
    search,
    goToNext,
    goToPrev,
    reset,
  };
}
