import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../store/notification.store";

interface NotificationClickDetail {
  route: string;
  notificationId: string;
}

export function useNotificationNavigation(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (event: Event) => {
      const detail = (event as CustomEvent<NotificationClickDetail>).detail;
      if (!detail?.route) return;

      useNotificationStore.getState().markRead(detail.notificationId);
      navigate(detail.route);
    };

    window.addEventListener("app:notification-click", handleClick);

    return () => {
      window.removeEventListener("app:notification-click", handleClick);
    };
  }, [navigate]);
}
