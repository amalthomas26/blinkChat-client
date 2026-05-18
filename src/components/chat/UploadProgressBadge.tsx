import {
  useUploadProgress,
  useUploadStatus,
} from "../../store/upload.selectors";

interface UploadProgressBadgeProps {
  uploadId: string | undefined;
}

export function UploadProgressBadge({ uploadId }: UploadProgressBadgeProps) {
  const progress = useUploadProgress(uploadId);
  const status = useUploadStatus(uploadId);

  if (!uploadId || status === "done" || status === "failed" || !status)
    return null;

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[#8b5cf6] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-slate-400">{progress}%</span>
    </div>
  );
}
