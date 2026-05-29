import { PhoneMissed, PhoneIncoming, PhoneOutgoing } from "../ui/icons";
import type { MessageDto } from "../../types";
import { formatMessageTime } from "../../lib/date";

interface CallMessageProps {
  message: MessageDto;
  isOwn: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CallMessage({ message, isOwn }: CallMessageProps) {
  const meta = message.callMeta;
  if (!meta) return null;

  const { callType, status, duration } = meta;

  const isMissed = status === "missed" || status === "rejected";
  const isFailed = status === "failed" || status === "cancelled";
  const isEnded = status === "ended";

  // Choose icon
  const Icon =
    isMissed ? PhoneMissed :
    isOwn    ? PhoneOutgoing :
    PhoneIncoming;

  // Color scheme
  const iconColor = isMissed || isFailed
    ? "text-rose-400"
    : isOwn
      ? "text-emerald-400"
      : "text-blue-400";

  const bgColor = isMissed || isFailed
    ? "bg-rose-500/10 border-rose-500/20"
    : "bg-[#1a202b] border-white/5";

  const label = message.content ?? (
    status === "missed" ? "Missed call"
    : status === "rejected" ? "Call declined"
    : status === "cancelled" ? "Call cancelled"
    : status === "failed" ? "Call failed"
    : `${callType === "video" ? "Video" : "Voice"} call`
  );

  const durationStr = isEnded && duration ? ` · ${formatDuration(duration)}` : "";

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm ${bgColor} max-w-[220px]`}>
      {/* Icon circle */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isMissed || isFailed ? "bg-rose-500/15" : "bg-white/8"}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${isMissed || isFailed ? "text-rose-300" : "text-white"}`}>
          {label}{durationStr}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
