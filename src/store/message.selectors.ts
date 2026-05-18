import { useShallow } from "zustand/react/shallow";
import { useMessageStore } from "./message.store";

export const useMessageIds = (conversationId: string) =>
  useMessageStore(
    useShallow((state) => state.idsByConversation[conversationId] ?? []),
  );

export const useMessage = (messageId: string) =>
  useMessageStore((state) => state.byId[messageId]);

export const useHasMoreMessages = (conversationId: string) =>
  useMessageStore((state) => state.hasMore[conversationId] ?? false);

export const useMessagesLoading = (conversationId: string) =>
  useMessageStore((state) => state.isLoadingMessages[conversationId] ?? false);

export const useMessagesError = (conversationId: string) =>
  useMessageStore((state) => state.errorByConversation[conversationId] ?? null);

export const useReadCursor = (conversationId: string) =>
  useMessageStore(
    (state) => state.readCursorByConversation[conversationId] ?? null,
  );

export const usePendingMessages = () =>
  useMessageStore(useShallow((state) => state.pendingMessages));

export const useMessageActions = () =>
  useMessageStore(
    useShallow((state) => ({
      fetchMessages: state.fetchMessages,
      addMessage: state.addMessage,
      addOptimisticMessage: state.addOptimisticMessage,
      confirmMessage: state.confirmMessage,
      failMessage: state.failMessage,
      deleteMessage: state.deleteMessage,
      addReaction: state.addReaction,
      removeReaction: state.removeReaction,
      updateDeliveryStatus: state.updateDeliveryStatus,
      updateReadStatus: state.updateReadStatus,
      clearConversationMessages: state.clearConversationMessages,
    })),
  );
