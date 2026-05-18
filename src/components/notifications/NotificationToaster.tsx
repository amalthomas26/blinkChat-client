import { useEffect } from "react";
import { useNotifications } from "../../store/notification.selectors";
import { useNotificationStore } from "../../store/notification.store";
import { NotificationToast } from "./NotificationToast";

const AUTO_DISMISS_MS = 6000;

export function NotificationToaster() {
  const notifications = useNotifications();
  const visibleNotifications = notifications.slice(0, 3);

  useEffect(() => {
    if (visibleNotifications.length === 0) return;

    const timers = visibleNotifications.map((notification) =>
      window.setTimeout(() => {
        useNotificationStore.getState().dismissNotification(notification.id);
      }, AUTO_DISMISS_MS),
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [visibleNotifications]);

  if (visibleNotifications.length === 0) return null;

  return (
    <div
      className="fixed left-4 right-4 top-4 z-[80] flex flex-col items-end gap-3 md:left-auto md:right-6 md:top-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {visibleNotifications.map((notification) => (
        <NotificationToast key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
