import {
  MessageType,
  type MessageDto,
  type ConversationListItemDto,
} from "../types";
import type { CallIncomingPayload } from "../types";

function getSenderName(
  message: MessageDto,
  conversation: ConversationListItemDto | undefined,
): string {
  const participant = conversation?.participants.find(
    (item) => item.id === message.senderId,
  );
  return participant?.name ?? conversation?.name ?? "New message";
}

export function getMessageNotificationContent({
  message,
  conversation,
}: {
  message: MessageDto;
  conversation: ConversationListItemDto | undefined;
}): { title: string; body: string } | null {
  if (message.type === MessageType.CALL) return null;

  const senderName = getSenderName(message, conversation);
  const conversationName = conversation?.name ?? senderName;

  const title =
    conversation?.type === "group"
      ? `${senderName} in ${conversationName}`
      : senderName;

  switch (message.type) {
    case MessageType.IMAGE:
      return { title, body: "Photo" };
    case MessageType.AUDIO:
      return { title, body: "Voice message" };
    case MessageType.VIDEO:
      return { title, body: "Video" };
    case MessageType.FILE:
      return { title, body: message.fileName ?? "File" };
    default:
      return { title, body: message.content?.trim() || "New message" };
  }
}

export function getIncomingCallNotificationContent(
  payload: CallIncomingPayload,
): { title: string; body: string } {
  return {
    title: `${payload.callerName} is calling`,
    body: `Incoming ${payload.callType === "video" ? "video" : "voice"} call`,
  };
}

export function getMissedCallNotificationContent({
  peerName,
  callType,
}: {
  peerName: string | null;
  callType: "audio" | "video" | null;
}): { title: string; body: string } {
  const safeName = peerName ?? "Someone";
  const safeType = callType === "video" ? "video" : "voice";

  return {
    title: `Missed ${safeType} call`,
    body: safeName,
  };
}
