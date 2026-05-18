import {
  useConnectionQuality,
  useCallPhase,
} from "../../store/call.selectors";
import type { ConnectionQuality as QualityType } from "../../types/call.types";
import type { CallPhase } from "../../types/call.types";


const QUALITY_CONFIG: Record<
  QualityType,
  { bars: number; color: string; label: string }
> = {
  good: { bars: 4, color: "bg-emerald-400", label: "Strong" },
  fair: { bars: 2, color: "bg-amber-400", label: "Fair" },
  poor: { bars: 1, color: "bg-rose-400", label: "Weak" },
};

function getPhaseLabel(phase: CallPhase): string {
  switch (phase) {
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "reconnecting":
      return "Reconnecting…";
    case "outgoing_ringing":
      return "Ringing…";
    case "incoming_ringing":
      return "Incoming…";
    case "failed":
      return "Failed";
    case "ended":
      return "Ended";
    default:
      return "";
  }
}

function SignalBars({
  activeBars,
  color,
  isPoor,
}: {
  activeBars: number;
  color: string;
  isPoor: boolean;
}) {
  const barHeights = ["h-1.5", "h-2.5", "h-3.5", "h-4.5"];

  return (
    <div className="flex items-end gap-[2px]">
      {barHeights.map((height, i) => {
        const isActive = i < activeBars;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-300 ${height} ${
              isActive ? color : "bg-white/20"
            } ${isPoor && isActive ? "animate-pulse" : ""}`}
          />
        );
      })}
    </div>
  );
}

export function ConnectionQualityBadge() {
  const quality = useConnectionQuality();
  const phase = useCallPhase();

  const phaseLabel = getPhaseLabel(phase);
  const config = quality ? QUALITY_CONFIG[quality] : null;

  // During connecting/reconnecting, show a spinner instead of bars
  const isTransitioning =
    phase === "connecting" || phase === "reconnecting" || phase === "outgoing_ringing";

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
      {/* Signal bars OR spinner */}
      {isTransitioning ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
      ) : config ? (
        <SignalBars
          activeBars={config.bars}
          color={config.color}
          isPoor={quality === "poor"}
        />
      ) : (
        // No quality data yet (just connected, first poll hasn't fired)
        <SignalBars activeBars={0} color="bg-white/20" isPoor={false} />
      )}

      {/* Text labels */}
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-medium text-white/90">
          {phaseLabel}
        </span>
        {config && phase === "connected" ? (
          <span
            className={`text-[9px] font-medium ${
              quality === "good"
                ? "text-emerald-300"
                : quality === "fair"
                  ? "text-amber-300"
                  : "text-rose-300"
            }`}
          >
            {config.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}