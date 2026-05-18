import type { ConversationListItemDto, MessageDto } from "../types";

function isConversationMuted(
  conversation: ConversationListItemDto | undefined,
): boolean {
  if (!conversation?.isMuted) return false;
  if (!conversation.mutedUntill) return true;
  return new Date(conversation.mutedUntill).getTime() > Date.now();
}

export function shouldNotifyForMessage({
  message,
  conversation,
  currentUserId,
  activeConversationId,
}: {
  message: MessageDto;
  conversation: ConversationListItemDto | undefined;
  currentUserId: string | undefined;
  activeConversationId: string | null;
}): boolean {
  if (!currentUserId) return false;
  if (message.senderId === currentUserId) return false;
  if (isConversationMuted(conversation)) return false;

  const isViewingConversation =
    activeConversationId === message.conversationId && !document.hidden;

  if (isViewingConversation) return false;

  return true;
}

export function shouldUseBrowserNotification(): boolean {
  return document.hidden;
}
