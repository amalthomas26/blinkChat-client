export type ResourceType = "image" | "video" | "audio" | "raw";

export interface UploadResultDTO {
  url: string;
  publicId: string;
  fileSize: number;
  mimeType: string;
  resourceType: ResourceType;
}
