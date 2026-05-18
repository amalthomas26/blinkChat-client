import {
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MEDIA_UPLOAD_LIMITS,
  VIDEO_MIME_TYPES,
} from "../constants";

import { MessageType, type MessageType as MessageTypeValue } from "../types";

export interface MediaValidationSuccess {
  valid: true;
}

export interface MediaValidationFailure {
  valid: false;
  message: string;
}

export type MediaValidationResult =
  | MediaValidationSuccess
  | MediaValidationFailure;

export function validateMediaFile(file: File): MediaValidationResult {
  if (file.size <= 0) {
    return { valid: false, message: "File is empty" };
  }

  if (file.size > MEDIA_UPLOAD_LIMITS.maxSizeBytes) {
    return {
      valid: false,
      message: `File is too large.Maximum size is ${MEDIA_UPLOAD_LIMITS.maxSizeLabel}`,
    };
  }

  if (!isAllowedMimeType(MEDIA_UPLOAD_LIMITS.allowedMimeTypes, file.type)) {
    return {
      valid: false,
      message: `File type "${file.type || "unknown"}" is not allowed`,
    };
  }

  return { valid: true };
}

function isAllowedMimeType(
  mimeTypes: readonly string[],
  type: string,
): boolean {
  return mimeTypes.some((mimeType) => mimeType === type);
}

export function getMessageTypeFromFile(file: File): MessageTypeValue {
  if (isAllowedMimeType(IMAGE_MIME_TYPES, file.type)) return MessageType.IMAGE;
  if (isAllowedMimeType(VIDEO_MIME_TYPES, file.type)) return MessageType.VIDEO;
  if (isAllowedMimeType(AUDIO_MIME_TYPES, file.type)) return MessageType.AUDIO;
  return MessageType.FILE;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatAudioTime(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || !isFinite(seconds)) {
    return "0:00";
  }
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
