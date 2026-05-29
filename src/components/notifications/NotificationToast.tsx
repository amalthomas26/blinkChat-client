import { useState, useEffect } from "react";
import { Phone, PhoneMissed, X } from "../ui/icons";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppNotificationKind, type AppNotification } from "../../types";
import { useNotificationStore } from "../../store/notification.store";
import { BlinkChatLogo } from "../ui/BlinkChatLogo";

interface NotificationToastProps {
  notification: AppNotification;
}

interface AvatarSectionProps {
  notification: AppNotification;
}

function AvatarSection({ notification }: AvatarSectionProps) {
  const { kind, avatarUrl, title } = notification;

  if (kind === AppNotificationKind.INCOMING_CALL) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <Phone className="h-4.5 w-4.5 text-emerald-400" />
      </div>
    );
  }

  if (kind === AppNotificationKind.MISSED_CALL) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-500/30">
        <PhoneMissed className="h-4.5 w-4.5 text-rose-400" />
      </div>
    );
  }

  // Message notification — show sender avatar or BlinkChat logo fallback
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[#8b5cf6]/30"
      />
    );
  }

  // Fallback: initials avatar
  const initial = title.charAt(0).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a2247] text-sm font-bold text-[#c4b5fd] ring-2 ring-[#8b5cf6]/20">
      {initial}
    </div>
  );
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const navigate = useNavigate();

  // Drive the slide-in from the right via a mount-state toggle
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
      className={[
        // Base card style — dark card matching the email screenshot
        "relative w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl",
        "bg-[#0d1117] shadow-2xl shadow-black/50",
        "border border-[#1e2a3a]",
        // Slide + fade entrance transition
        "transition-all duration-300 ease-out",
        visible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, #8b5cf6, #6d28d9)" }}
      />

      <div className="flex items-start gap-3 px-4 pb-4 pt-5">
        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-2">
          <BlinkChatLogo size={20} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <AvatarSection notification={notification} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {notification.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                {notification.body}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="ml-1 mt-0.5 shrink-0 rounded-lg p-1 text-slate-600 transition-colors hover:bg-white/5 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
