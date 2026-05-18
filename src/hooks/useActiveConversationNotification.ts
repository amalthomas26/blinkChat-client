import { useEffect } from "react";
import { useNotificationStore } from "../store/notification.store";

export function useActiveConversationNotification(
  conversationId: string | undefined,
): void {
  useEffect(() => {
    const safeConversationId = conversationId ?? null;
    useNotificationStore.getState().setActiveConversationId(safeConversationId);

    return () => {
      const currentActive =
        useNotificationStore.getState().activeConversationId;

      if (currentActive === safeConversationId) {
        useNotificationStore.getState().setActiveConversationId(null);
      }
    };
  }, [conversationId]);
}
