export const MessageType = {
  TEXT: "text",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  FILE: "file",
  CALL: "call",
  SYSTEM: "system",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface MessageDeliveryDto {
  userId: string;
  deliveredAt: string;
}

export interface MessageDto {
  _id: string;
  conversationId: string;
  senderId: string;
  clientTempId?: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  audioDuration?: number;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  callMeta?: {
    callType: "audio" | "video";
    status: "ended" | "missed" | "rejected" | "cancelled" | "failed";
    duration: number | null;
  };
  createdAt: string;
  deliveredTo: MessageDeliveryDto[];
  reactions?: { userId: string; emoji: string }[];
  replyTo?: string;
  replyToSnapshot?: {
    senderId: string;
    type: MessageType;
    content?: string;
    mediaUrl?: string;
  };
  forwardedFrom?: {
    originalSenderId: string;
    originalSenderName: string;
    originalMessageId: string;
    originalConversationId: string;
  };
}

export type MessageStatus = "pending" | "sent" | "failed";

export interface OptimisticMessageDto extends MessageDto {
  clientTempId: string;
  status: "pending" | "failed";
  error?: string;
  retryFile?: File;
  localPreviewUrl?: string;
  uploadId?:string;
}

export type ChatMessage = MessageDto | OptimisticMessageDto;

export interface MessageListResponseMeta {
  hasMore: boolean;
}

export interface MessageSendDraft {
  conversationId: string;
  type: MessageType;
  content?: string;
  file?: File;
  audioDuration?: number;
  replyTo?: string;
}

export interface MessageContextMenuAction {
  messageId: string;
  x: number;
  y: number;
}

export interface SendMessageInput {
  conversationId: string;
  clientTempId?: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  audioDuration?: number;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
}

export interface ForwardMessageInput {
  sourceMessageId: string;
  targetConversationId: string;
}

export interface SearchMessagesResult {
  messages: MessageDto[];
  hasNextPage: boolean;
}
