import { formatDateSeparator } from "../../lib/date";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-full border border-[#273244] bg-[#151b2b] px-3 py-1 text-xs font-medium text-slate-400">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}
