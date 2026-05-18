import type {
  BrowserNotificationInput,
  BrowserNotificationPermission,
} from "../types";

function getPermission(): BrowserNotificationPermission {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function requestPermission(): Promise<BrowserNotificationPermission> {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

function canShow(): boolean {
  return getPermission() === "granted";
}

function show(input: BrowserNotificationInput): void {
  if (!canShow()) return;

  const notification = new Notification(input.title, {
    body: input.body,
    tag: input.tag,
    icon: input.icon,
    requireInteraction: input.requireInteraction,
    renotify: true,
    data: {
      id: input.id,
      route: input.route,
    },
  });

    notification.onclick = () => {
    window.focus();
    window.dispatchEvent(
      new CustomEvent("app:notification-click", {
        detail: { route: input.route, notificationId: input.id },
      }),
    );
    notification.close();
  };
}

function vibrate(pattern: number | number[]): void {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const browserNotificationService = {
  getPermission,
  requestPermission,
  canShow,
  show,
  vibrate,
};

