import { useShallow } from "zustand/react/shallow";
import { useConversationStore } from "./conversation.store";

const EMPTY_SET = new Set<string>();

export const useConversationList = () =>
  useConversationStore(
    useShallow((s) => s.orderedIds.map((id) => s.byId[id]).filter(Boolean)),
  );

export const useConversation = (id: string) =>
  useConversationStore((s) => s.byId[id]);

export const useConversationsLoading = () =>
  useConversationStore((s) => s.isLoading);

export const useConversationsError = () =>
  useConversationStore((s) => s.error);

export const useConversationsHasNextPage = () =>
  useConversationStore((s) => s.hasNextPage);

export const useConversationsNextCursor = () =>
  useConversationStore((s) => s.nextCursor);

export const useTypingUsers = (convId: string) =>
  useConversationStore((s) => s.typingUsers[convId] ?? EMPTY_SET);

export const useConversationActions = () =>
  useConversationStore(
    useShallow((s) => ({
      fetchConversations: s.fetchConversations,
      upsertConversation: s.upsertConversation,
      removeConversation: s.removeConversation,
      updateLastMessage: s.updateLastMessage,
      updateAfterMessageDelete: s.updateAfterMessageDelete,
      updateUnreadCount: s.updateUnreadCount,
      incrementUnreadCount: s.incrementUnreadCount,
      setTypingUser: s.setTypingUser,
      clearTypingUser: s.clearTypingUser,
      toggleMute: s.toggleMute,
      togglePin: s.togglePin,
    }))
  );
