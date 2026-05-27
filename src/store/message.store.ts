import { create } from "zustand";
import { messageService } from "../services/message.service";
import type { MessageDto, OptimisticMessageDto } from "../types";
import { ApiError } from "../lib/api";
import { useAuthStore } from "./auth.store";

export interface OptimisticMessage extends OptimisticMessageDto {
  clientTempId: string;
  status: "pending" | "failed";
}

export interface MessageState {
  byId: Record<string, MessageDto>;
  idsByConversation: Record<string, string[]>;
  hasMore: Record<string, boolean>;
  pendingMessages: Record<string, OptimisticMessage>;
  isLoadingMessages: Record<string, boolean>;
  errorByConversation: Record<string, string | null>;
  readCursorByConversation: Record<string, string | null>;
}
export interface MessageActions {
  fetchMessages: (conversationId: string, before?: string) => Promise<void>;
  addMessage: (message: MessageDto) => void;
  addOptimisticMessage: (message: OptimisticMessageDto) => void;
  confirmMessage: (clientTempId: string, serverMessage: MessageDto) => void;
  failMessage: (clientTempId: string, error?: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, userId: string, emoji: string) => void;
  removeReaction: (messageId: string, userId: string) => void;
  updateDeliveryStatus: (conversationId: string, messageIds: string[]) => void;
  updateReadStatus: (
    conversationId: string,
    lastSeenMessageId: string,
    readerId: string,
  ) => void;
  clearConversationMessages: (conversationId: string) => void;
}

export type MessageStore = MessageState & MessageActions;

function insertSorted(
  ids: string[],
  byId: Record<string, MessageDto | OptimisticMessageDto>,
  newId: string,
  newCreatedAt: string,
): string[] {
  if (ids.includes(newId)) return ids;

  const newTime = new Date(newCreatedAt).getTime();

  // Fast path: most messages are the newest — skip the linear scan
  if (ids.length === 0) return [newId];
  const lastTime = new Date(byId[ids[ids.length - 1]]?.createdAt ?? 0).getTime();
  if (newTime >= lastTime) return [...ids, newId];

  const insertAt = ids.findIndex((id) => {
    const existingTime = new Date(byId[id]?.createdAt ?? 0).getTime();
    return existingTime > newTime;
  });

  if (insertAt === -1) return [...ids, newId];

  const nextIds = [...ids];
  nextIds.splice(insertAt, 0, newId);
  return nextIds;
}

function getMessageError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Failed to load messages";
}

export const useMessageStore = create<MessageStore>()((set, get) => ({
  byId: {},
  idsByConversation: {},
  hasMore: {},
  pendingMessages: {},
  isLoadingMessages: {},
  errorByConversation: {},
  readCursorByConversation: {},

  fetchMessages: async (conversationId, before) => {
    if (get().isLoadingMessages[conversationId]) return;

    set((state) => ({
      isLoadingMessages: {
        ...state.isLoadingMessages,
        [conversationId]: true,
      },
      errorByConversation: {
        ...state.errorByConversation,
        [conversationId]: null,
      },
    }));

    try {
      const response = await messageService.fetchMessages(conversationId, {
        before,
        limit: 20,
      });

      const incomingAscending = [...response.data].reverse();

      set((state) => {
        const nextById = { ...state.byId };
        let nextIds = state.idsByConversation[conversationId] ?? [];

        for (const message of incomingAscending) {
          nextById[message._id] = message;
          nextIds = insertSorted(
            nextIds,
            nextById,
            message._id,
            message.createdAt,
          );
        }

        return {
          byId: nextById,
          idsByConversation: {
            ...state.idsByConversation,
            [conversationId]: nextIds,
          },
          hasMore: {
            ...state.hasMore,
            [conversationId]: response.meta?.hasMore ?? false,
          },
          isLoadingMessages: {
            ...state.isLoadingMessages,
            [conversationId]: false,
          },
        };
      });
    } catch (error: unknown) {
      set((state) => ({
        isLoadingMessages: {
          ...state.isLoadingMessages,
          [conversationId]: false,
        },
        errorByConversation: {
          ...state.errorByConversation,
          [conversationId]: getMessageError(error),
        },
      }));
    }
  },

  addMessage: (message) => {
    const state = get();

    if (state.byId[message._id]) return;

    if (message.clientTempId && state.pendingMessages[message.clientTempId]) {
      get().confirmMessage(message.clientTempId, message);
      return;
    }

    set((current) => {
      const conversationIds =
        current.idsByConversation[message.conversationId] ?? [];

      const nextById = {
        ...current.byId,
        [message._id]: message,
      };

      return {
        byId: nextById,
        idsByConversation: {
          ...current.idsByConversation,
          [message.conversationId]: insertSorted(
            conversationIds,
            nextById,
            message._id,
            message.createdAt,
          ),
        },
      };
    });
  },

  addOptimisticMessage: (message) => {
    set((state) => {
      const conversationIds =
        state.idsByConversation[message.conversationId] ?? [];

      return {
        byId: {
          ...state.byId,
          [message._id]: message,
        },
        idsByConversation: {
          ...state.idsByConversation,
          [message.conversationId]: [...conversationIds, message._id],
        },
        pendingMessages: {
          ...state.pendingMessages,
          [message.clientTempId]: message,
        },
      };
    });
  },

  confirmMessage: (tempId, realMsg) => {
    set((s) => {
      const optimistic = s.pendingMessages[tempId];
      if (!optimistic) return s;

      const fakeId = optimistic._id;

      const newById = { ...s.byId };
      delete newById[fakeId];
      newById[realMsg._id] = realMsg;

      const convIds = s.idsByConversation[realMsg.conversationId] ?? [];
      const idx = convIds.indexOf(fakeId);
      let newConvIds: string[];
      if (idx !== -1) {
        newConvIds = [...convIds];
        newConvIds[idx] = realMsg._id;
      } else {
        newConvIds = [...convIds, realMsg._id];
      }

      const newPending = { ...s.pendingMessages };
      delete newPending[tempId];

      return {
        byId: newById,
        idsByConversation: {
          ...s.idsByConversation,
          [realMsg.conversationId]: newConvIds,
        },
        pendingMessages: newPending,
      };
    });
  },

  failMessage: (clientTempId, error) => {
    set((state) => {
      const optimistic = state.pendingMessages[clientTempId];
      if (!optimistic) return state;

      const failedMessage: OptimisticMessageDto = {
        ...optimistic,
        status: "failed",
        error: error ?? "Message failed to send",
      };

      return {
        byId: {
          ...state.byId,
          [optimistic._id]: failedMessage,
        },
        pendingMessages: {
          ...state.pendingMessages,
          [clientTempId]: failedMessage,
        },
      };
    });
  },

  deleteMessage: (messageId) => {
    set((state) => {
      const message = state.byId[messageId];
      if (!message) return state;

      const nextById = { ...state.byId };
      delete nextById[messageId];
      const currentIds = state.idsByConversation[message.conversationId] ?? [];

      return {
        byId: nextById,
        idsByConversation: {
          ...state.idsByConversation,
          [message.conversationId]: currentIds.filter((id) => id !== messageId),
        },
      };
    });
  },
  addReaction: (messageId, userId, emoji) => {
    set((state) => {
      const message = state.byId[messageId];
      if (!message) return state;

      const reactionsWithoutUser = (message.reactions ?? []).filter(
        (reaction) => reaction.userId !== userId,
      );

      return {
        byId: {
          ...state.byId,
          [messageId]: {
            ...message,
            reactions: [...reactionsWithoutUser, { userId, emoji }],
          },
        },
      };
    });
  },

  removeReaction: (messageId, userId) => {
    set((state) => {
      const message = state.byId[messageId];
      if (!message) return state;

      return {
        byId: {
          ...state.byId,
          [messageId]: {
            ...message,
            reactions: (message.reactions ?? []).filter(
              (reaction) => reaction.userId !== userId,
            ),
          },
        },
      };
    });
  },

  updateDeliveryStatus: (conversationId, messageIds) => {
    set((state) => {
      const nextById = { ...state.byId };
      let changed = false;

      for (const messageId of messageIds) {
        const message = nextById[messageId];
        if (!message || message.conversationId !== conversationId) continue;

        nextById[messageId] = {
          ...message,
          deliveredTo:
            message.deliveredTo.length > 0
              ? message.deliveredTo
              : [
                  {
                    userId: "_delivered_",
                    deliveredAt: new Date().toISOString(),
                  },
                ],
        };

        changed = true;
      }

      return changed ? { byId: nextById } : state;
    });
  },

  updateReadStatus: (conversationId, lastSeenMessageId, readerId) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (readerId === currentUserId) return;

    set((state) => {
      const existing = state.readCursorByConversation[conversationId];

      if (existing && existing >= lastSeenMessageId) return state;
      return {
        readCursorByConversation: {
          ...state.readCursorByConversation,
          [conversationId]: lastSeenMessageId,
        },
      };
    });
  },
  clearConversationMessages: (conversationId) => {
    set((state) => {
      const messageIds = state.idsByConversation[conversationId] ?? [];
      const newById = { ...state.byId };
      for (const id of messageIds) {
        delete newById[id];
      }
      const newIdsByConversation = { ...state.idsByConversation };
      delete newIdsByConversation[conversationId];
      return { byId: newById, idsByConversation: newIdsByConversation };
    });
  },
}));
