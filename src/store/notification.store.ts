import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  BrowserNotificationPermission,
  CreateAppNotificationInput,
} from "../types";

const MAX_NOTIFICATIONS = 30;

interface NotificationState {
  byId: Record<string, AppNotification>;
  orderedIds: string[];
  seenSourceKeys: Set<string>;
  activeConversationId: string | null;
  browserPermission: BrowserNotificationPermission;
  isGlobalMuted: boolean;
}

interface NotificationActions {
  addNotification: (input: CreateAppNotificationInput) => AppNotification;
  markRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  hasSeenSource: (sourceKey: string) => boolean;
  markSourceSeen: (sourceKey: string) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  setBrowserPermission: (permission: BrowserNotificationPermission) => void;
  toggleGlobalMute: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;

function createNotificationId(input: CreateAppNotificationInput): string {
  if (input.messageId) return `message:${input.messageId}`;
  if (input.callId) return `call:${input.kind}:${input.callId}`;
  return `${input.kind}:${Date.now()}`;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
  byId: {},
  orderedIds: [],
  seenSourceKeys: new Set<string>(),
  activeConversationId: null,
  browserPermission:
    "Notification" in window ? Notification.permission : "unsupported",
  isGlobalMuted: false,

  addNotification: (input) => {
    const notification: AppNotification = {
      id: createNotificationId(input),
      kind: input.kind,
      title: input.title,
      body: input.body,
      route: input.route,
      createdAt: new Date().toISOString(),
      conversationId: input.conversationId,
      messageId: input.messageId,
      callId: input.callId,
      avatarUrl: input.avatarUrl,
      read: false,
    };

    set((state) => {
      const nextById = {
        ...state.byId,
        [notification.id]: notification,
      };

      const nextOrderedIds = [
        notification.id,
        ...state.orderedIds.filter((id) => id !== notification.id),
      ].slice(0, MAX_NOTIFICATIONS);

      const allowedIds = new Set(nextOrderedIds);
      const compactById = Object.fromEntries(
        Object.entries(nextById).filter(([id]) => allowedIds.has(id)),
      );

      return {
        byId: compactById,
        orderedIds: nextOrderedIds,
      };
    });

    return notification;
  },

  markRead: (id) => {
    set((state) => {
      const existing = state.byId[id];
      if (!existing || existing.read) return state;

      return {
        byId: {
          ...state.byId,
          [id]: { ...existing, read: true },
        },
      };
    });
  },

  dismissNotification: (id) => {
    set((state) => {
      const nextById = { ...state.byId };
      delete nextById[id];

      return {
        byId: nextById,
        orderedIds: state.orderedIds.filter((itemId) => itemId !== id),
      };
    });
  },

  clearAll: () => set({ byId: {}, orderedIds: [] }),

  hasSeenSource: (sourceKey) => get().seenSourceKeys.has(sourceKey),

  markSourceSeen: (sourceKey) => {
    set((state) => {
      const next = new Set(state.seenSourceKeys);
      next.add(sourceKey);
      // SM-2 fix: cap at 500 entries to prevent unbounded growth
      if (next.size > 500) {
        const it = next.values();
        next.delete(it.next().value!);
      }
      return { seenSourceKeys: next };
    });
  },

  setActiveConversationId: (conversationId) => {
    set({ activeConversationId: conversationId });
  },

  setBrowserPermission: (permission) => {
    set({ browserPermission: permission });
  },

  toggleGlobalMute: () => {
    set((state) => {
      // If unmuting and browser permission is default, we can also try to request it.
      // But we handle the actual request in the UI component to ensure it's triggered by user interaction.
      return { isGlobalMuted: !state.isGlobalMuted };
    });
  },
}),
    {
      name: "blinkchat-notifications",
      partialize: (state) => ({ isGlobalMuted: state.isGlobalMuted }),
    }
  )
);
