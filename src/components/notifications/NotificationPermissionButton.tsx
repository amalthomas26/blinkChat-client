import { Bell, BellOff } from "../ui/icons";
import { browserNotificationService } from "../../services/browserNotification.service";
import { useBrowserNotificationPermission } from "../../store/notification.selectors";
import { useNotificationStore } from "../../store/notification.store";

export function NotificationPermissionButton() {
  const permission = useBrowserNotificationPermission();
  const isGlobalMuted = useNotificationStore((state) => state.isGlobalMuted);

  const handleClick = () => {
    // 1. Immediately toggle the in-app mute state so the UI feels responsive (no freezing)
    useNotificationStore.getState().toggleGlobalMute();

    // 2. If they just unmuted (meaning previous state was muted) AND we haven't asked
    // for OS permission yet, ask asynchronously in the background.
    if (isGlobalMuted && permission === "default") {
      browserNotificationService.requestPermission().then((nextPermission) => {
        useNotificationStore.getState().setBrowserPermission(nextPermission);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isGlobalMuted ? "Enable notifications" : "Mute notifications"}
      title={isGlobalMuted ? "Enable notifications" : "Mute notifications"}
      // shrink-0 prevents it from squishing, active:scale-95 adds a nice click feel
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#273244] text-slate-300 transition-all hover:bg-white/5 active:scale-95 ${
        isGlobalMuted ? "opacity-60" : ""
      }`}
    >
      {isGlobalMuted ? (
        <BellOff className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
    </button>
  );
}
