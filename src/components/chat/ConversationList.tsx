import { useCallback, useMemo } from "react";
import { ConversationItem } from "./ConversationItem";
import { useConversations } from "../../hooks/useConversations";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";

interface ConversationListProps {
  filterQuery: string;
  selectedConversationId?: string;
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-[#1d2635] px-4 py-4 md:px-6">
      <div className="h-14 w-14 animate-pulse rounded-full bg-white/5" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
      </div>
      <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
    </div>
  );
}

export function ConversationList({
  filterQuery,
  selectedConversationId,
}: ConversationListProps) {
  const {
    conversations,
    isInitialLoading,
    isLoading,
    error,
    hasNextPage,
    loadMore,
    retry,
  } = useConversations();

  const normalizedQuery = filterQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) => {
      const preview = conversation.lastMessage?.content ?? "";
      const participantNames = conversation.participants
        .map((participant) => participant.name)
        .join(" ");

      return [conversation.name ?? "", preview, participantNames].some(
        (value) => value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [conversations, normalizedQuery]);

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage,
    isLoading,
    onLoadMore: handleLoadMore,
  });

  if (isInitialLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, index) => (
          <ConversationSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-xl border border-[#273244] px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    const emptyCopy = normalizedQuery
      ? "No conversations match your search."
      : "No conversations yet.";

    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
        {emptyCopy}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {error && conversations.length > 0 ? (
        <div className="border-b border-[#3a2831] bg-[#24151b] px-4 py-2 text-sm text-rose-300 md:px-6">
          {error}
        </div>
      ) : null}

      {filteredConversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === selectedConversationId}
        />
      ))}

      {hasNextPage ? (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
