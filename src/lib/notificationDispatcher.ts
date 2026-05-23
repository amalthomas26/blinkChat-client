import { browserNotificationService } from "../services/browserNotification.service";
import { useNotificationStore } from "../store/notification.store";
import type { CreateAppNotificationInput } from "../types";
import { AppNotificationKind } from "../types";
import { shouldUseBrowserNotification } from "./notificationRules";

export function dispatchAppNotification(
  input: CreateAppNotificationInput,
): void {
  const state = useNotificationStore.getState();
  if (state.isGlobalMuted) return;

  const notification = state.addNotification(input);

  const shouldUseNative = shouldUseBrowserNotification();

  if (shouldUseNative) {
    browserNotificationService.show({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      route: notification.route,
      icon: notification.avatarUrl,
      tag:
        notification.conversationId ?? notification.callId ?? notification.id,
      requireInteraction:
        notification.kind === AppNotificationKind.INCOMING_CALL,
    });
  }

  if (
    input.kind === AppNotificationKind.INCOMING_CALL ||
    input.kind === AppNotificationKind.MISSED_CALL
  ) {
    browserNotificationService.vibrate([80, 40, 80]);
  }
}
