import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowLeft,
  Loader2,
} from "../../components/ui/icons";
import { useNavigate } from "react-router-dom";
import {
  callService,
  type CallHistoryItem,
} from "../../services/call.service";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < dayMs * 2) {
    return "Yesterday";
  }
  if (diff < dayMs * 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

function getStatusInfo(item: CallHistoryItem): {
  label: string;
  color: string;
  Icon: typeof Phone;
} {
  if (item.status === "missed") {
    return {
      label: "Missed",
      color: "text-rose-400",
      Icon: PhoneMissed,
    };
  }
  if (item.status === "rejected") {
    return {
      label: "Declined",
      color: "text-rose-400",
      Icon: PhoneMissed,
    };
  }
  if (item.status === "cancelled") {
    return {
      label: "Cancelled",
      color: "text-slate-400",
      Icon: item.direction === "outgoing" ? PhoneOutgoing : PhoneIncoming,
    };
  }
  if (item.status === "failed") {
    return {
      label: "Failed",
      color: "text-rose-400",
      Icon: PhoneMissed,
    };
  }
  // ended (successful call)
  return {
    label: formatDuration(item.duration) || "Ended",
    color: item.direction === "outgoing" ? "text-emerald-400" : "text-blue-400",
    Icon: item.direction === "outgoing" ? PhoneOutgoing : PhoneIncoming,
  };
}

function CallHistoryListItem({ item }: { item: CallHistoryItem }) {
  const { label, color, Icon } = getStatusInfo(item);
  const navigate = useNavigate();

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5 active:bg-white/10 sm:gap-4 sm:px-4"
      onClick={() => navigate(`/chat`)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {item.peer.avatar ? (
          <img
            src={item.peer.avatar}
            alt={item.peer.name}
            className="h-11 w-11 rounded-full border border-white/10 object-cover sm:h-12 sm:w-12"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2a2247] text-xs font-bold text-[#c4b5fd] sm:h-12 sm:w-12 sm:text-sm">
            {getInitials(item.peer.name || "?")}
          </div>
        )}
        {/* Call type icon overlay */}
        <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#101620] ring-2 ring-[#101620]">
          {item.callType === "video" ? (
            <Video className="h-3 w-3 text-slate-400" />
          ) : (
            <Phone className="h-3 w-3 text-slate-400" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {item.peer.name}
        </p>
        <div className={`flex items-center gap-1.5 text-xs ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
      </div>

      {/* Timestamp */}
      <span className="shrink-0 text-[11px] text-slate-500 sm:text-xs">
        {formatDate(item.createdAt)}
      </span>
    </div>
  );
}

export function CallHistoryPage() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callService.fetchCallHistory(p, 30);
      setCalls(result.calls);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch {
      setError("Failed to load call history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(1);
  }, [fetchPage]);

  return (
    <div
      className="flex flex-col bg-[#0a0e17]"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#273244] bg-[#101620] px-3 sm:h-16 sm:px-4">
        <button
          type="button"
          onClick={() => navigate("/chat")}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white sm:text-lg">Call History</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && calls.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 px-4">
            <p className="text-sm text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchPage(1)}
              className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7c3aed] active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Phone className="h-12 w-12 text-slate-600" />
            <p className="text-sm text-slate-400">No calls yet</p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl divide-y divide-white/5 px-1 py-1 sm:px-2 sm:py-2">
            {calls.map((call) => (
              <CallHistoryListItem key={call._id} item={call} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 px-4 py-4 sm:gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchPage(page - 1)}
              className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400 sm:text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchPage(page + 1)}
              className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
