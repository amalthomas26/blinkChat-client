import { Bell, BellOff } from "lucide-react";
import { browserNotificationService } from "../../services/browserNotification.service";
import { useBrowserNotificationPermission } from "../../store/notification.selectors";
import { useNotificationStore } from "../../store/notification.store";

export function NotificationPermissionButton() {
  const permission = useBrowserNotificationPermission();
  const isGlobalMuted = useNotificationStore((state) => state.isGlobalMuted);

  const handleClick = async () => {
    // If we're unmuting and haven't asked for browser permission yet, ask now.
    if (isGlobalMuted && permission === "default") {
      const nextPermission =
        await browserNotificationService.requestPermission();
      useNotificationStore.getState().setBrowserPermission(nextPermission);
    }
    useNotificationStore.getState().toggleGlobalMute();
  };

  if (permission === "unsupported") {
    return null;
  }

  // If the browser explicitly denied permission, the app can't show them anyway.
  // We can treat it visually as "muted" and disabled so they know they have to fix it in browser settings.
  const isBrowserDenied = permission === "denied";
  const effectivelyMuted = isGlobalMuted || isBrowserDenied;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBrowserDenied}
      aria-label={effectivelyMuted ? "Enable notifications" : "Mute notifications"}
      title={
        isBrowserDenied
          ? "Notifications are blocked in browser settings"
          : effectivelyMuted
            ? "Enable notifications"
            : "Mute notifications"
      }
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#273244] text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 ${
        effectivelyMuted ? "opacity-60" : ""
      }`}
    >
      {effectivelyMuted ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  );
}
