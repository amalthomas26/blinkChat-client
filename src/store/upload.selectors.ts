import { useShallow } from "zustand/react/shallow";
import { useUploadStore } from "./upload.store";

// Accepts undefined so callers can pass uploadId directly from OptimisticMessageDto
export const useUpload = (id: string | undefined) =>
  useUploadStore((s) => (id ? s.uploads[id] : undefined));

export const useUploadProgress = (id: string | undefined) =>
  useUploadStore((s) => (id ? s.uploads[id]?.progress ?? 0 : 0));

export const useUploadStatus = (id: string | undefined) =>
  useUploadStore((s) => (id ? s.uploads[id]?.status : undefined));

export const useAllUploads = () =>
  useUploadStore(useShallow((s) => Object.values(s.uploads)));

export const useUploadActions = () =>
  useUploadStore(
    useShallow((s) => ({
      startUpload: s.startUpload,
      updateProgress: s.updateProgress,
      completeUpload: s.completeUpload,
      failUpload: s.failUpload,
      removeUpload: s.removeUpload,
    })),
  );
