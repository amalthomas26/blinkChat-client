import { create } from "zustand";
import { conversationService } from "../services/conversation.service";
import type {
  ConversationListItemDto,
  ConversationListMessageDto,
  ConversationListUserDto,
} from "../types";
import { ApiError } from "../lib/api";

type TypingUsers = Record<string, Set<string>>;

export interface ConversationState {
  byId: Record<string, ConversationListItemDto>;
  orderedIds: string[]; // sorted desc by updatedAt
  hasNextPage: boolean;
  nextCursor: string | null;
  isLoading: boolean;
  typingUsers: TypingUsers;
  error: string | null;
}

export interface ConversationActions {
  fetchConversations: (cursor?: string) => Promise<void>;
  upsertConversation: (dto: ConversationListItemDto) => void;
  removeConversation: (id: string) => void;
  updateLastMessage: (convId: string, msg: ConversationListMessageDto) => void;
  updateAfterMessageDelete: (
    convId: string,
    deletedMessageId: string,
    lastMessage: ConversationListMessageDto | null,
    updatedAt: string,
  ) => void;
  updateUnreadCount: (convId: string, count: number) => void;
  incrementUnreadCount: (convId: string) => void;
  setTypingUser: (convId: string, userId: string) => void;
  clearTypingUser: (convId: string, userId: string) => void;
  toggleMute: (convId: string, isMuted: boolean) => void;
  togglePin: (convId: string, isPinned: boolean) => void;
  updateParticipants: (
    convId: string,
    participants: ConversationListUserDto[],
  ) => void;
  updateGroupName: (convId: string, name: string) => void;
  updateGroupAvatar: (convId: string, groupAvatar: string | null) => void;
  updatePeerLastSeen: (peerId: string, lastSeen: string) => void;
}

export type ConversationStore = ConversationState & ConversationActions;

function sortByUpdatedAt(
  byId: Record<string, ConversationListItemDto>,
  ids: string[],
): string[] {
  return [...ids].sort((a, b) => {
    const aTime = new Date(byId[a]?.updatedAt ?? 0).getTime();
    const bTime = new Date(byId[b]?.updatedAt ?? 0).getTime();
    return bTime - aTime; // newest first
  });
}

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  byId: {},
  orderedIds: [],
  hasNextPage: false,
  nextCursor: null,
  isLoading: false,
  typingUsers: {},
  error: null,

  fetchConversations: async (cursor?: string) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const res = await conversationService.listConversations({
        limit: 20,
        cursor,
      });
      const { conversations, hasNextPage, nextCursor } = res.data;

      set((state) => {
        const newById = { ...state.byId };
        for (const conv of conversations) {
          newById[conv.id] = conv;
        }

        // On first load: start with empty IDs. On pagination: keep existing.
        const base = cursor ? state.orderedIds : [];
        const incoming = conversations.map((c) => c.id);
        // Deduplicate with Set in case two pages overlap due to concurrent updates
        const merged = Array.from(new Set([...base, ...incoming]));

        return {
          byId: newById,
          orderedIds: sortByUpdatedAt(newById, merged),
          hasNextPage,
          nextCursor,
          isLoading: false,
        };
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load conversations",
      });
    }
  },

  // Used when: new conversation started, socket pushes a group_created event.
  // If the conversation already exists, it updates and re-sorts.
  // If it's new, it appends to orderedIds then sorts.
  upsertConversation: (dto) => {
    set((state) => {
      const newById = { ...state.byId, [dto.id]: dto };
      const isNew = !(dto.id in state.byId);
      const ids = isNew ? [...state.orderedIds, dto.id] : state.orderedIds;
      return { byId: newById, orderedIds: sortByUpdatedAt(newById, ids) };
    });
  },

  // Used when: user leaves a group, conversation is deleted.
  removeConversation: (id) => {
    set((state) => {
      const newById = { ...state.byId };
      delete newById[id];

      return {
        byId: newById,
        orderedIds: state.orderedIds.filter((x) => x !== id),
      };
    });
  },

  // Called by socket handler on `receive_message`.
  // Updates the preview text + bumps updatedAt → conversation floats to top.
  updateLastMessage: (convId, msg) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state; // unknown conversation, ignore

      const newById = {
        ...state.byId,
        [convId]: { ...conv, lastMessage: msg, updatedAt: msg.createdAt },
      };

      // OPT-3: O(n) move-to-front instead of O(n log n) full sort.
      // A new message always makes this conversation the most recent.
      const idx = state.orderedIds.indexOf(convId);
      if (idx === 0) {
        return { byId: newById };
      }
      const nextIds = [...state.orderedIds];
      if (idx > 0) nextIds.splice(idx, 1);
      nextIds.unshift(convId);
      return { byId: newById, orderedIds: nextIds };
    });
  },

  updateAfterMessageDelete: (
    convId,
    deletedMessageId,
    lastMessage,
    updatedAt,
  ) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      if (conv.lastMessage?.id !== deletedMessageId) return state;

      const newById = {
        ...state.byId,
        [convId]: {
          ...conv,
          lastMessage,
          updatedAt,
        },
      };

      return {
        byId: newById,
        orderedIds: sortByUpdatedAt(newById, state.orderedIds),
      };
    });
  },

  // count = 0 → user opened the chat, clear badge.
  updateUnreadCount: (convId, count) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: {
            ...conv,
            unread: {
              ...conv.unread,
              unreadCount: count,
              hasUnread: count > 0,
            },
          },
        },
      };
    });
  },

  incrementUnreadCount: (convId) => {
    set((state) => {
      const conversation = state.byId[convId];
      if (!conversation) return state;

      const unreadCount = conversation.unread.unreadCount + 1;

      return {
        byId: {
          ...state.byId,
          [convId]: {
            ...conversation,
            unread: {
              ...conversation.unread,
              unreadCount,
              hasUnread: true,
            },
          },
        },
      };
    });
  },

  // IMPORTANT: Always `new Set(existing)` — never mutate the existing Set.
  // Zustand compares by reference; mutating in-place is invisible to it.
  setTypingUser: (convId, userId) => {
    set((state) => {
      const prev = state.typingUsers[convId] ?? new Set<string>();
      return {
        typingUsers: {
          ...state.typingUsers,
          [convId]: new Set(prev).add(userId),
        },
      };
    });
  },

  clearTypingUser: (convId, userId) => {
    set((state) => {
      const prev = state.typingUsers[convId];
      if (!prev) return state;

      const next = new Set(prev);
      next.delete(userId);

      if (next.size === 0) {
        const rest = { ...state.typingUsers };
        delete rest[convId];

        return { typingUsers: rest }; // clean up empty Set
      }
      return { typingUsers: { ...state.typingUsers, [convId]: next } };
    });
  },
  toggleMute: (convId, isMuted) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: { ...conv, isMuted, mutedUntill: null },
        },
      };
    });
  },

  togglePin: (convId, isPinned) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: { ...conv, isPinned },
        },
      };
    });
  },

  updateParticipants: (convId, participants) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: { ...conv, participants },
        },
      };
    });
  },

  updateGroupName: (convId, name) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: { ...conv, name },
        },
      };
    });
  },

  updateGroupAvatar: (convId, groupAvatar) => {
    set((state) => {
      const conv = state.byId[convId];
      if (!conv) return state;
      return {
        byId: {
          ...state.byId,
          [convId]: { ...conv, groupAvatar },
        },
      };
    });
  },

  updatePeerLastSeen: (peerId, lastSeen) => {
    set((state) => {
      let hasChanges = false;
      const newById = { ...state.byId };

      for (const conv of Object.values(newById)) {
        if (conv.peer?.id === peerId) {
          newById[conv.id] = {
            ...conv,
            peer: { ...conv.peer, lastSeen },
          };
          hasChanges = true;
        }
      }

      if (!hasChanges) return state;
      return { byId: newById };
    });
  },
}));
