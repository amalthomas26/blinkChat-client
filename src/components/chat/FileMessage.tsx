import { FileDown } from "../ui/icons";
import { formatFileSize } from "../../lib/media";

interface FileMessageProps {
  href: string;
  fileName?: string;
  fileSize?: number;
}

export function FileMessage({ href, fileName, fileSize }: FileMessageProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 transition hover:bg-white/5"
    >
      <FileDown className="h-5 w-5 shrink-0 text-[#a78bfa]" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-200">
          {fileName ?? "Download file"}
        </p>
        {fileSize ? (
          <p className="text-xs text-slate-400">{formatFileSize(fileSize)}</p>
        ) : null}
      </div>
    </a>
  );
}
