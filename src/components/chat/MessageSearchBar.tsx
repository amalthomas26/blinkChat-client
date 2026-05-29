import { useRef, useEffect } from "react";
import { ArrowLeft, ChevronUp, ChevronDown, Loader2, Search } from "../ui/icons";

interface MessageSearchBarProps {
  query: string;
  currentIndex: number;
  totalCount: number;
  isSearching: boolean;
  onQueryChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function MessageSearchBar({
  query,
  currentIndex,
  totalCount,
  isSearching,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}: MessageSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the search bar appears
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  const showCounter = query.trim().length >= 2 && !isSearching;

  return (
    <header className="flex h-20 shrink-0 items-center gap-3 border-b border-[#273244] bg-[#101620] px-4 md:px-6">
      {/* Back arrow */}
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/5"
        title="Close search"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Search input container */}
      <div className="relative flex flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages…"
          className="h-11 w-full rounded-xl border border-[#273244] bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/30"
        />
      </div>

      {/* Results counter + navigation */}
      <div className="flex shrink-0 items-center gap-1">
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#8b5cf6]" />
        ) : showCounter ? (
          <span className="min-w-[4.5rem] text-center text-xs text-slate-400">
            {totalCount === 0
              ? "No results"
              : `${currentIndex + 1} of ${totalCount}`}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onPrev}
          disabled={totalCount === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous result (Shift+Enter)"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={totalCount === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next result (Enter)"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
