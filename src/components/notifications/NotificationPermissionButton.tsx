import { Bell, BellOff } from "lucide-react";
import { browserNotificationService } from "../../services/browserNotification.service";
import { useBrowserNotificationPermission } from "../../store/notification.selectors";
import { useNotificationStore } from "../../store/notification.store";

export function NotificationPermissionButton() {
  const permission = useBrowserNotificationPermission();

  const handleClick = async () => {
    const nextPermission = await browserNotificationService.requestPermission();

    useNotificationStore.getState().setBrowserPermission(nextPermission);
  };

  if (permission === "unsupported") {
    return null;
  }

  const isDenied = permission === "denied";
  const isGranted = permission === "granted";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDenied || isGranted}
      aria-label={
        isGranted
          ? "Notifications enabled"
          : isDenied
            ? "Notifications blocked"
            : "Enable notifications"
      }
      title={
        isGranted
          ? "Notifications enabled"
          : isDenied
            ? "Notifications are blocked in browser settings"
            : "Enable notifications"
      }
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#273244] text-slate-300 transition hover:bg-white/5 disabled:cursor-default disabled:opacity-60"
    >
      {isDenied ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  );
}
