import type { MessageDto, SendMessageInput } from "./message.types";
import type {
  ConversationListItemDto,
  ConversationListMessageDto,
  ConversationListUserDto,
} from "./conversation.types";
import type {
  CallType,
  CallIncomingPayload,
  CallAcceptedPayload,
  CallRejectedPayload,
  CallEndedPayload,
  CallReconnectingPayload,
  CallFailedPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCRestartIcePayload,
} from "./call.types";

export type ApiSocketResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TypingPayload {
  conversationId: string;
}

export interface SendMessagePayload extends Omit<SendMessageInput, "type"> {
  type?: SendMessageInput["type"];
}

export interface JoinConversationResponse {
  success: boolean;
  error?: string;
}

export interface ConversationAccessErrorPayload {
  conversationId: string;
  code:
    | "INVALID_CONVERSATION_ID"
    | "CONVERSATION_NOT_FOUND"
    | "CONVERSATION_ACCESS_DENIED"
    | "CONVERSATION_ACCESS_ERROR";
  message: string;
}

export interface MessageDeletedPayload {
  messageId: string;
  conversationId: string;
  deletedMessageSenderId: string;
  lastMessageChanged: boolean;
  lastMessage: ConversationListMessageDto | null;
  updatedAt: string;
}

//client to server events

export interface ClientToServerEvents {
  send_message: (
    payload: SendMessagePayload,
    callback?: (response: ApiSocketResponse<MessageDto>) => void,
  ) => void;

  messages_delivered: (
    payload: { conversationId: string; messageIds: string[] },
    callback?: (
      response: ApiSocketResponse<{
        updatedCount: number;
        messageIds: string[];
      }>,
    ) => void,
  ) => void;

  messages_read: (
    payload: { conversationId: string; lastSeenMessageId: string },
    callback?: (response: ApiSocketResponse<{ updatedCount: number }>) => void,
  ) => void;

  sync_messages: (
    payload: {
      conversationId: string;
      lastMessageId?: string;
      limit?: number;
    },
    callback?: (response: ApiSocketResponse<MessageDto[]>) => void,
  ) => void;

  typing_start: (payload: TypingPayload) => void;
  typing_stop: (payload: TypingPayload) => void;

  join_conversation: (
    conversationId: string,
    callback?: (response: JoinConversationResponse) => void,
  ) => void;

  leave_conversation: (
    conversationId: string,
    callback?: (response: JoinConversationResponse) => void,
  ) => void;

  delete_message: (
    payload: { messageId: string },
    callback: (res: ApiSocketResponse<MessageDeletedPayload>) => void,
  ) => void;

  get_presence: (
    userIds: string[],
    callback: (onlineUserIds: string[]) => void,
  ) => void;

  // ─── Call Lifecycle ───
  "call:initiate": (
    payload: { receiverId: string; callType: CallType },
    callback?: (response: ApiSocketResponse<{ callId: string }>) => void,
  ) => void;

  "call:ringing": (
    payload: { callId: string; callerId: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  "call:accept": (
    payload: { callId: string },
    callback?: (response: ApiSocketResponse<{ callId: string }>) => void,
  ) => void;

  "call:reject": (
    payload: { callId: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  "call:end": (
    payload: { callId: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  // ─── WebRTC Signaling ───
  "webrtc:offer": (
    payload: { callId: string; sdp: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  "webrtc:answer": (
    payload: { callId: string; sdp: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  "webrtc:ice-candidate": (
    payload: { callId: string; candidate: RTCIceCandidateInit },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;

  "webrtc:restart-ice": (
    payload: { callId: string },
    callback?: (response: ApiSocketResponse<null>) => void,
  ) => void;
}

//server to client events

export interface ServerToClientEvents {
  receive_message: (payload: MessageDto) => void;
  message_deleted: (payload: MessageDeletedPayload) => void;

  messages_delivered_update: (payload: {
    conversationId: string;
    messageIds: string[];
  }) => void;

  messages_read_update: (payload: {
    conversationId: string;
    lastSeenMessageId: string;
    readerId: string;
  }) => void;

  user_typing: (payload: TypingPayload & { userId: string }) => void;
  user_stopped_typing: (payload: TypingPayload & { userId: string }) => void;

  user_online: (payload: { userId: string }) => void;
  user_offline: (payload: { userId: string }) => void;

  conversation_access_error: (payload: ConversationAccessErrorPayload) => void;

  group_created: (payload: ConversationListItemDto) => void;
  group_members_added: (payload: {
    conversationId: string;
    members: ConversationListUserDto[];
  }) => void;
  group_members_removed: (payload: {
    conversationId: string;
    removedUserIds: string[];
  }) => void;
  group_renamed: (payload: { conversationId: string; name: string }) => void;
  group_member_left: (payload: {
    conversationId: string;
    userId: string;
    newAdminId?: string;
  }) => void;
  group_avatar_updated: (payload: {
    conversationId: string;
    groupAvatar: string;
  }) => void;
  group_avatar_deleted: (payload: { conversationId: string }) => void;
  member_promoted: (payload: {
    conversationId: string;
    promotedUserId: string;
  }) => void;
  member_demoted: (payload: {
    conversationId: string;
    demoteUserId: string;
  }) => void;

  message_pinned: (payload: {
    conversationId: string;
    messageId: string;
    pinnedBy: string;
  }) => void;
  message_unpinned: (payload: {
    conversationId: string;
    messageId: string;
  }) => void;

  message_reaction_added: (payload: {
    conversationId: string;
    messageId: string;
    userId: string;
    emoji: string;
  }) => void;
  message_reaction_removed: (payload: {
    conversationId: string;
    messageId: string;
    userId: string;
  }) => void;

  // ─── Call Lifecycle ───
  "call:incoming": (payload: CallIncomingPayload) => void;
  "call:ringing": (payload: { callId: string }) => void;
  "call:accepted": (payload: CallAcceptedPayload) => void;
  "call:rejected": (payload: CallRejectedPayload) => void;
  "call:ended": (payload: CallEndedPayload) => void;
  "call:reconnecting": (payload: CallReconnectingPayload) => void;
  "call:failed": (payload: CallFailedPayload) => void;

  // ─── WebRTC Signaling ───
  "webrtc:offer": (payload: WebRTCOfferPayload) => void;
  "webrtc:answer": (payload: WebRTCAnswerPayload) => void;
  "webrtc:ice-candidate": (payload: WebRTCIceCandidatePayload) => void;
  "webrtc:restart-ice": (payload: WebRTCRestartIcePayload) => void;
}
