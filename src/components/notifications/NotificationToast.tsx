import { MessageCircle, Phone, PhoneMissed, X } from "lucide-react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppNotificationKind, type AppNotification } from "../../types";
import { useNotificationStore } from "../../store/notification.store";

interface NotificationToastProps {
  notification: AppNotification;
}

function NotificationIcon({ kind }: { kind: AppNotification["kind"] }) {
  if (kind === AppNotificationKind.INCOMING_CALL) {
    return <Phone className="h-4 w-4 text-emerald-300" />;
  }

  if (kind === AppNotificationKind.MISSED_CALL) {
    return <PhoneMissed className="h-4 w-4 text-rose-300" />;
  }

  return <MessageCircle className="h-4 w-4 text-[#c4b5fd]" />;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const navigate = useNavigate();

  const handleOpen = () => {
    useNotificationStore.getState().markRead(notification.id);
    useNotificationStore.getState().dismissNotification(notification.id);
    navigate(notification.route);
  };

  const handleDismiss = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    useNotificationStore.getState().dismissNotification(notification.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className="flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl border border-[#273244] bg-[#151b2b] p-3 text-left text-white shadow-2xl shadow-black/30 transition hover:bg-[#1a2233]"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
        <NotificationIcon kind={notification.kind} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{notification.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">
          {notification.body}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
