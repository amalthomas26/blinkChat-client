import { create } from "zustand";
import type { UploadResultDTO } from "../types";

export type UploadStatus = "uploading" | "done" | "failed";

export interface UploadEntry {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  progress: number;
  status: UploadStatus;
  localPreviewUrl?: string;
  result?: UploadResultDTO;
  error?: string;
}

export interface UploadState {
  uploads: Record<string, UploadEntry>;
}

export interface UploadActions {
  startUpload: (entry: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    localPreviewUrl?: string;
  }) => void;
  updateProgress: (id: string, percent: number) => void;
  completeUpload: (id: string, result: UploadResultDTO) => void;
  failUpload: (id: string, error: string) => void;
  removeUpload: (id: string) => void;
}

export type UploadStore = UploadState & UploadActions;

export const useUploadStore = create<UploadStore>()((set) => ({
  uploads: {},

startUpload: (entry) =>
  set((state) => ({
    uploads: {
      ...state.uploads,
      [entry.id]: {
        ...entry,
        progress: 0,
        status: "uploading",
      },
    },
  })),

  updateProgress: (id, percent) =>
    set((s) => {
      const entry = s.uploads[id];
      if (!entry) return s;
      return {
        uploads: { ...s.uploads, [id]: { ...entry, progress: percent } },
      };
    }),

  completeUpload: (id, result) =>
    set((s) => {
      const entry = s.uploads[id];
      if (!entry) return s;
      return {
        uploads: {
          ...s.uploads,
          [id]: { ...entry, progress: 100, status: "done", result },
        },
      };
    }),

  failUpload: (id, error) =>
    set((s) => {
      const entry = s.uploads[id];
      if (!entry) return s;
      return {
        uploads: { ...s.uploads, [id]: { ...entry, status: "failed", error } },
      };
    }),

  removeUpload: (id) =>
    set((s) => {
      const newUploads = { ...s.uploads };
      delete newUploads[id];
      return { uploads: newUploads };
    }),
}));