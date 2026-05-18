interface TypingIndicatorProps {
  label: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-5 py-2 text-sm text-slate-400">
      <span>{label}</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:240ms]" />
      </span>
    </div>
  );
}
