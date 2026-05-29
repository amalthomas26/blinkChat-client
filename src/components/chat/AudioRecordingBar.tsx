import { Mic, Send, X } from "../ui/icons";
import { formatAudioTime } from "../../lib/media";

interface AudioRecordingBarProps {
  elapsedSeconds: number;
  onCancel: () => void;
  onSend: () => void;
}

export function AudioRecordingBar({
  elapsedSeconds,
  onCancel,
  onSend,
}: AudioRecordingBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2">
      <span className="flex h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
      <Mic className="h-4 w-4 text-rose-300" />
      <span className="flex-1 text-sm font-mono text-slate-300">
        {formatAudioTime(elapsedSeconds)}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
        title="Cancel recording"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSend}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
        title="Send voice note"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
