import { useCallStore } from "../store/call.store";
import type {
  CallIncomingPayload,
  CallAcceptedPayload,
  CallEndedPayload,
  CallReconnectingPayload,
  CallFailedPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
  WebRTCRestartIcePayload,
} from "../types";

import { useEffect } from "react";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth.store";
import { useMessageStore } from "../store/message.store";
import { useConversationStore } from "../store/conversation.store";
import { usePresenceStore } from "../store/presence.store";
import { conversationService } from "../services/conversation.service";
import type {
  MessageDeletedPayload,
  MessageDto,
  ConversationListItemDto,
} from "../types";

function isMessageAfterCursor(
  messageId: string,
  lastSeenMessageId: string | null,
): boolean {
  return !lastSeenMessageId || messageId > lastSeenMessageId;
}

function shouldDecrementUnreadCount(
  conversation: ConversationListItemDto | undefined,
  payload: MessageDeletedPayload,
  currentUserId: string | undefined,
): boolean {
  if (!conversation || !currentUserId) return false;
  if (payload.deletedMessageSenderId === currentUserId) return false;
  if (conversation.unread.unreadCount <= 0) return false;

  return isMessageAfterCursor(
    payload.messageId,
    conversation.unread.lastSeenMessageId,
  );
}

export const useSocket = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const accessToken = useAuthStore((s) => s.accessToken as string | null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketService.disconnect();
      return;
    }

    const socket = socketService.connect(accessToken);

    const handleReceiveMessage = async (msg: MessageDto) => {
      useMessageStore.getState().addMessage(msg);

      const conversationStore = useConversationStore.getState();
      const currentUserId = useAuthStore.getState().user?.id;

      if (!conversationStore.byId[msg.conversationId]) {
        try {
          const response = await conversationService.getConversation(
            msg.conversationId,
          );
          useConversationStore.getState().upsertConversation(response.data);
        } catch {
          return;
        }
      }

      useConversationStore.getState().updateLastMessage(msg.conversationId, {
        id: msg._id,
        senderId: msg.senderId,
        type: msg.type,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        thumbnailUrl: msg.thumbnailUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        createdAt: msg.createdAt,
      });

      if (msg.senderId !== currentUserId) {
        useConversationStore
          .getState()
          .incrementUnreadCount(msg.conversationId);
      }
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload) => {
      const conversationStore = useConversationStore.getState();
      const conversation = conversationStore.byId[payload.conversationId];
      const currentUserId = useAuthStore.getState().user?.id;
      const shouldDecrementUnread = shouldDecrementUnreadCount(
        conversation,
        payload,
        currentUserId,
      );

      useMessageStore.getState().deleteMessage(payload.messageId);

      if (payload.lastMessageChanged) {
        conversationStore.updateAfterMessageDelete(
          payload.conversationId,
          payload.messageId,
          payload.lastMessage,
          payload.updatedAt,
        );
      }

      if (shouldDecrementUnread && conversation) {
        conversationStore.updateUnreadCount(
          payload.conversationId,
          Math.max(0, conversation.unread.unreadCount - 1),
        );
      }
    };

    const handleDeliveryUpdate = (payload: {
      conversationId: string;
      messageIds: string[];
    }) => {
      useMessageStore
        .getState()
        .updateDeliveryStatus(payload.conversationId, payload.messageIds);
    };

    const handleReadUpdate = (payload: {
      conversationId: string;
      lastSeenMessageId: string;
      readerId: string;
    }) => {
      useMessageStore
        .getState()
        .updateReadStatus(
          payload.conversationId,
          payload.lastSeenMessageId,
          payload.readerId,
        );
    };
    const handleGroupCreated = (conversation: ConversationListItemDto) => {
      useConversationStore.getState().upsertConversation(conversation);
    };

    const handleTyping = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      useConversationStore
        .getState()
        .setTypingUser(payload.conversationId, payload.userId);
    };

    const handleStoppedTyping = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      useConversationStore
        .getState()
        .clearTypingUser(payload.conversationId, payload.userId);
    };

    const handleOnline = (payload: { userId: string }) => {
      usePresenceStore.getState().setOnline(payload.userId);
    };

    const handleOffline = (payload: { userId: string }) => {
      usePresenceStore.getState().setOffline(payload.userId);
    };

    const handleReactionAdded = (payload: {
      conversationId: string;
      messageId: string;
      userId: string;
      emoji: string;
    }) => {
      useMessageStore
        .getState()
        .addReaction(payload.messageId, payload.userId, payload.emoji);
    };

    const handleReactionRemoved = (payload: {
      conversationId: string;
      messageId: string;
      userId: string;
    }) => {
      useMessageStore
        .getState()
        .removeReaction(payload.messageId, payload.userId);
    };

    const handleCallIncoming = (payload: CallIncomingPayload) => {
      console.log("[call:incoming] received:", payload.callId, "from:", payload.callerName, "current phase:", useCallStore.getState().phase);
      
      const phase = useCallStore.getState().phase;
      if (phase !== "idle") return; // Let store ignore it

      useCallStore.getState().receiveIncomingCall({
        callId: payload.callId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        callType: payload.callType,
      });

      // Acknowledge to the server that we are ringing
      socket.emit("call:ringing", { 
        callId: payload.callId, 
        callerId: payload.callerId 
      });

      console.log("[call:incoming] phase after:", useCallStore.getState().phase);
    };

    const handleCallRinging = (_payload: { callId: string }) => {
      useCallStore.getState().setPeerRinging();
    };

    const handleCallAccepted = (_payload: CallAcceptedPayload) => {
      useCallStore.getState().setConnecting();
    };

    const handleCallRejected = () => {
      useCallStore.getState().endCall("Call rejected");
      window.dispatchEvent(new CustomEvent("call:cleanup"));
    };

    const handleCallEnded = (payload: CallEndedPayload) => {
      useCallStore.getState().endCall(payload.reason);
      window.dispatchEvent(new CustomEvent("call:cleanup"));
    };

    const handleCallReconnecting = (_payload: CallReconnectingPayload) => {
      useCallStore.getState().setReconnecting();
    };

    const handleCallFailed = (payload: CallFailedPayload) => {
      useCallStore.getState().setFailed(payload.reason);
      window.dispatchEvent(new CustomEvent("call:cleanup"));
    };

    const handleWebRTCOffer = (payload: WebRTCOfferPayload) => {
      window.dispatchEvent(
        new CustomEvent("webrtc:offer", { detail: payload }),
      );
    };

    const handleWebRTCAnswer = (payload: WebRTCAnswerPayload) => {
      window.dispatchEvent(
        new CustomEvent("webrtc:answer", { detail: payload }),
      );
    };

    const handleWebRTCIceCandidate = (payload: WebRTCIceCandidatePayload) => {
      window.dispatchEvent(
        new CustomEvent("webrtc:ice-candidate", { detail: payload }),
      );
    };

    const handleWebRTCRestartIce = (payload: WebRTCRestartIcePayload) => {
      window.dispatchEvent(
        new CustomEvent("webrtc:restart-ice", { detail: payload }),
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("group_created", handleGroupCreated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messages_delivered_update", handleDeliveryUpdate);
    socket.on("messages_read_update", handleReadUpdate);
    socket.on("user_typing", handleTyping);
    socket.on("user_stopped_typing", handleStoppedTyping);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("message_reaction_added", handleReactionAdded);
    socket.on("message_reaction_removed", handleReactionRemoved);

    socket.on("call:incoming", handleCallIncoming);
    socket.on("call:ringing", handleCallRinging);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:reconnecting", handleCallReconnecting);
    socket.on("call:failed", handleCallFailed);
    socket.on("webrtc:offer", handleWebRTCOffer);
    socket.on("webrtc:answer", handleWebRTCAnswer);
    socket.on("webrtc:ice-candidate", handleWebRTCIceCandidate);
    socket.on("webrtc:restart-ice", handleWebRTCRestartIce);

    // syncPresence asks the server which peers are *actually* online
    // right now and bulk-replaces the client store (fixes stale dots).
    const syncPresence = () => {
      const conversations = useConversationStore.getState().byId;
      const peerIds = Object.values(conversations)
        .map((conv) => conv.peer?.id)
        .filter((id): id is string => Boolean(id));

      if (peerIds.length === 0) return;

      socket.emit("get_presence", peerIds, (onlineIds) => {
        usePresenceStore.getState().bulkSetPresence(onlineIds);
      });
    };

    // Fire on every socket reconnect (handles network blips, hot-reload).
    socket.on("connect", syncPresence);

    // Problem: on first mount the socket connects BEFORE conversations
    // are fetched, so peerIds is empty and syncPresence does nothing.
    // Solution: subscribe to the conversation store and re-run the moment
    // conversations first load. Unsubscribe immediately after so it only
    // fires once per connection lifecycle.
    const unsubConversations = useConversationStore.subscribe((state) => {
      if (state.orderedIds.length > 0 && socket.connected) {
        syncPresence();
        unsubConversations(); // only need one successful sync
      }
    });

    // Also fire immediately if both are already ready on mount
    if (socket.connected) syncPresence();
    // ─────────────────────────────────────────────────────────────────

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("group_created", handleGroupCreated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("messages_delivered_update", handleDeliveryUpdate);
      socket.off("messages_read_update", handleReadUpdate);
      socket.off("user_typing", handleTyping);
      socket.off("user_stopped_typing", handleStoppedTyping);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("message_reaction_added", handleReactionAdded);
      socket.off("message_reaction_removed", handleReactionRemoved);

      socket.off("call:incoming", handleCallIncoming);
      socket.off("call:ringing", handleCallRinging);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:reconnecting", handleCallReconnecting);
      socket.off("call:failed", handleCallFailed);
      socket.off("webrtc:offer", handleWebRTCOffer);
      socket.off("webrtc:answer", handleWebRTCAnswer);
      socket.off("webrtc:ice-candidate", handleWebRTCIceCandidate);
      socket.off("webrtc:restart-ice", handleWebRTCRestartIce);

      socket.off("connect", syncPresence);
      unsubConversations();
    };
  }, [isAuthenticated, accessToken]);
};
