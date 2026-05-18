import { useShallow } from "zustand/react/shallow";
import { useNotificationStore } from "./notification.store";
import type { BrowserNotificationPermission } from "../types";

export const useNotifications = () =>
  useNotificationStore(
    useShallow((state) =>
      state.orderedIds.map((id) => state.byId[id]).filter(Boolean),
    ),
  );

export const useUnreadNotificationCount = (): number =>
  useNotificationStore(
    (state) => state.orderedIds.filter((id) => !state.byId[id]?.read).length,
  );

export const useBrowserNotificationPermission =
  (): BrowserNotificationPermission =>
    useNotificationStore((state) => state.browserPermission);

export const useNotificationActions = () =>
  useNotificationStore(
    useShallow((state) => ({
      addNotification: state.addNotification,
      markRead: state.markRead,
      dismissNotification: state.dismissNotification,
      clearAll: state.clearAll,
      setActiveConversationId: state.setActiveConversationId,
      setBrowserPermission: state.setBrowserPermission,
    })),
  );
