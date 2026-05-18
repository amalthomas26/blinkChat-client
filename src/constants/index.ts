export const MEDIA_UPLOAD_LIMITS = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeLabel: "10 MB",
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "application/pdf",
    "text/plain",
  ],
} as const;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;