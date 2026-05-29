import { Phone, PhoneOff } from "../ui/icons";
import { useCallPeer, useCallType } from "../../store/call.selectors";
import { useCallActions } from "../../hooks/useCallActions";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function IncomingCallDialog() {
  const { peerName, peerAvatar } = useCallPeer();
  const callType = useCallType();
  const { acceptCall, rejectCall } = useCallActions();

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0e17]/95 px-6 backdrop-blur-xl"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Avatar with pulse animation */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-[#8b5cf6]/20" />
        <div className="absolute inset-0 -m-2 animate-pulse rounded-full bg-[#8b5cf6]/10" />

        {peerAvatar ? (
          <img
            src={peerAvatar}
            alt={peerName ?? "Caller"}
            className="relative h-24 w-24 rounded-full border-4 border-[#8b5cf6]/30 object-cover sm:h-28 sm:w-28"
          />
        ) : (
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#8b5cf6]/30 bg-[#2a2247] text-2xl font-bold text-[#c4b5fd] sm:h-28 sm:w-28 sm:text-3xl">
            {getInitials(peerName ?? "?")}
          </div>
        )}
      </div>

      <h2 className="mb-1 text-xl font-semibold text-white sm:text-2xl">
        {peerName ?? "Unknown"}
      </h2>
      <p className="mb-10 text-xs text-slate-400 sm:mb-12 sm:text-sm">
        Incoming {callType === "video" ? "video" : "audio"} call…
      </p>

      {/* Accept / Decline buttons */}
      <div className="flex items-center gap-10 sm:gap-12">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={rejectCall}
            aria-label="Decline call"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-500 active:scale-95 sm:h-16 sm:w-16"
          >
            <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <span className="text-xs text-slate-400">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={acceptCall}
            aria-label="Accept call"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 hover:bg-emerald-500 active:scale-95 sm:h-16 sm:w-16"
          >
            <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <span className="text-xs text-slate-400">Accept</span>
        </div>
      </div>
    </div>
  );
}
