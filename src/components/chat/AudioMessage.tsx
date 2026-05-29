import { useState } from "react";
import { Pause, Play } from "../ui/icons";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { formatAudioTime } from "../../lib/media";

interface AudioMessageProps {
  src: string;
  duration?: number;
}

export function AudioMessage({ src, duration }: AudioMessageProps) {
  const {
    playing,
    currentTime,
    duration: loadedDuration,
    toggle,
    seek,
    isActive,
  } = useAudioPlayer(src);
  
  const [scrubbingTime, setScrubbingTime] = useState<number | null>(null);

  const totalDuration =
    isActive && loadedDuration > 0 ? loadedDuration : (duration ?? 0);
  
  const displayTime = scrubbingTime !== null ? scrubbingTime : (isActive ? currentTime : 0);

  return (
    <div className="flex w-52 items-center gap-3 py-1">
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6] text-white transition hover:bg-[#7c3aed]"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.01}
          value={displayTime}
          onChange={(e) => setScrubbingTime(Number(e.target.value))}
          onPointerUp={() => {
            if (scrubbingTime !== null) {
              seek(scrubbingTime);
              setScrubbingTime(null);
            }
          }}
          onPointerCancel={() => setScrubbingTime(null)}
          className="w-full accent-[#8b5cf6] cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{isActive ? formatAudioTime(displayTime) : "0:00"}</span>
          <span>{formatAudioTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
