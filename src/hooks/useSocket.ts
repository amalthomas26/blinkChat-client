import { useCallStore } from "../store/call.store";
import type {
  CallIncomingPayload,
  CallEndedPayload,
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

import { AppNotificationKind } from "../types";
import { useNotificationStore } from "../store/notification.store";
import { dispatchAppNotification } from "../lib/notificationDispatcher";
import {
  getIncomingCallNotificationContent,
  getMessageNotificationContent,
  getMissedCallNotificationContent,
} from "../lib/notificationContent";
import { shouldNotifyForMessage } from "../lib/notificationRules";

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

// In-flight guard to prevent duplicate parallel fetches when added to a new group
const inFlightFetches = new Set<string>();

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
      const sourceKey = `message:${msg._id}`;
      const notificationStore = useNotificationStore.getState();
      const alreadySeen = notificationStore.hasSeenSource(sourceKey);

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
      const latestConversationStore = useConversationStore.getState();
      const conversation = latestConversationStore.byId[msg.conversationId];

      latestConversationStore.updateLastMessage(msg.conversationId, {
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
        latestConversationStore.incrementUnreadCount(msg.conversationId);
      }

      if (alreadySeen) return;

      if (
        shouldNotifyForMessage({
          message: msg,
          conversation,
          currentUserId,
          activeConversationId: notificationStore.activeConversationId,
        })
      ) {
        const content = getMessageNotificationContent({
          message: msg,
          conversation,
        });

        if (content) {
          dispatchAppNotification({
            kind: AppNotificationKind.NEW_MESSAGE,
            title: content.title,
            body: content.body,
            route: `/chat/${msg.conversationId}`,
            conversationId: msg.conversationId,
            messageId: msg._id,
          });
        }
      }

      notificationStore.markSourceSeen(sourceKey);
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

    const handleGroupMembersAdded = async (payload: {
      conversationId: string;
      members: import("../types").ConversationListUserDto[];
    }) => {
      const store = useConversationStore.getState();
      const currentUserId = useAuthStore.getState().user?.id;
      
      let conv = store.byId[payload.conversationId];
      
      // If the current user was added to a group but it's not in their store, 
      // fetch it so it immediately appears in their conversation list.
      if (!conv && currentUserId && payload.members.some(m => m.id === currentUserId)) {
        if (inFlightFetches.has(payload.conversationId)) return;
        
        inFlightFetches.add(payload.conversationId);
        try {
          const response = await conversationService.getConversation(payload.conversationId);
          useConversationStore.getState().upsertConversation(response.data);
          conv = response.data;
        } catch (err) {
          console.error("Failed to fetch new group conversation", err);
          return;
        } finally {
          inFlightFetches.delete(payload.conversationId);
        }
      }
      
      // If conversation is STILL not found (user wasn't added, just missed an event for an unknown conv), exit safely
      if (!conv) return;

      const latestStore = useConversationStore.getState();
      const latestConv = latestStore.byId[payload.conversationId];
      if (!latestConv) return;
      
      const existingIds = new Set(latestConv.participants.map((p) => p.id));
      const merged = [
        ...latestConv.participants,
        ...payload.members.filter((m) => !existingIds.has(m.id)),
      ];
      latestStore.updateParticipants(payload.conversationId, merged);
    };

    const handleGroupMembersRemoved = (payload: {
      conversationId: string;
      removedUserIds: string[];
    }) => {
      const store = useConversationStore.getState();
      const currentUserId = useAuthStore.getState().user?.id;
      const removedSet = new Set(payload.removedUserIds);
      
      // If the current user was removed, drop the conversation entirely
      if (currentUserId && removedSet.has(currentUserId)) {
        store.removeConversation(payload.conversationId);
        return;
      }
      
      const conv = store.byId[payload.conversationId];
      // If conversation not in store, ignore safely
      if (!conv) return;
      
      store.updateParticipants(
        payload.conversationId,
        conv.participants.filter((p) => !removedSet.has(p.id)),
      );
    };

    const handleGroupRenamed = (payload: {
      conversationId: string;
      name: string;
    }) => {
      useConversationStore.getState().updateGroupName(payload.conversationId, payload.name);
    };

    const handleGroupMemberLeft = (payload: {
      conversationId: string;
      userId: string;
      newAdminId?: string;
    }) => {
      const store = useConversationStore.getState();
      const currentUserId = useAuthStore.getState().user?.id;
      
      // If the current user left, drop the conversation entirely
      if (currentUserId === payload.userId) {
        store.removeConversation(payload.conversationId);
        return;
      }

      const conv = store.byId[payload.conversationId];
      // If conversation not in store, ignore safely
      if (!conv) return;
      
      let updated = conv.participants.filter((p) => p.id !== payload.userId);
      if (payload.newAdminId) {
        updated = updated.map((p) =>
          p.id === payload.newAdminId ? { ...p, role: "admin" as const } : p,
        );
      }
      store.updateParticipants(payload.conversationId, updated);
    };

    const handleGroupAvatarUpdated = (payload: {
      conversationId: string;
      groupAvatar: string;
    }) => {
      useConversationStore
        .getState()
        .updateGroupAvatar(payload.conversationId, payload.groupAvatar);
    };

    const handleGroupAvatarDeleted = (payload: { conversationId: string }) => {
      useConversationStore
        .getState()
        .updateGroupAvatar(payload.conversationId, null);
    };

    const handleMemberPromoted = (payload: {
      conversationId: string;
      promotedUserId: string;
    }) => {
      const store = useConversationStore.getState();
      const conv = store.byId[payload.conversationId];
      if (!conv) return;
      store.updateParticipants(
        payload.conversationId,
        conv.participants.map((p) =>
          p.id === payload.promotedUserId ? { ...p, role: "admin" as const } : p,
        ),
      );
    };

    const handleMemberDemoted = (payload: {
      conversationId: string;
      demoteUserId: string;
    }) => {
      const store = useConversationStore.getState();
      const conv = store.byId[payload.conversationId];
      if (!conv) return;
      store.updateParticipants(
        payload.conversationId,
        conv.participants.map((p) =>
          p.id === payload.demoteUserId ? { ...p, role: "member" as const } : p,
        ),
      );
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
      useConversationStore.getState().updatePeerLastSeen(payload.userId, new Date().toISOString());
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
      const beforePhase = useCallStore.getState().phase;

      useCallStore.getState().receiveIncomingCall({
        callId: payload.callId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        callType: payload.callType,
      });

      const afterState = useCallStore.getState();
      const wasAcceptedIntoState =
        beforePhase === "idle" && afterState.phase === "incoming_ringing";

      if (!wasAcceptedIntoState) return;

      const sourceKey = `call:incoming:${payload.callId}`;
      const notificationStore = useNotificationStore.getState();
      if (notificationStore.hasSeenSource(sourceKey)) return;

      const content = getIncomingCallNotificationContent(payload);

      dispatchAppNotification({
        kind: AppNotificationKind.INCOMING_CALL,
        title: content.title,
        body: content.body,
        route: "/chat",
        callId: payload.callId,
        avatarUrl: payload.callerAvatar,
      });

      notificationStore.markSourceSeen(sourceKey);
    };

    const handleCallRinging = () => {
      useCallStore.getState().setPeerRinging();
    };

    const handleCallAccepted = () => {
      useCallStore.getState().setConnecting();
    };

    const handleCallRejected = () => {
      useCallStore.getState().endCall("Call rejected");
      window.dispatchEvent(new CustomEvent("call:cleanup"));
    };

    const handleCallReconnecting = () => {
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
    const handleCallEnded = (payload: CallEndedPayload) => {
      const callState = useCallStore.getState();
      const shouldNotifyMissedCall =
        payload.reason === "missed" && callState.direction === "incoming";

      if (shouldNotifyMissedCall) {
        const sourceKey = `call:missed:${payload.callId}`;
        const notificationStore = useNotificationStore.getState();

        if (!notificationStore.hasSeenSource(sourceKey)) {
          const content = getMissedCallNotificationContent({
            peerName: callState.peerName,
            callType: callState.callType,
          });

          dispatchAppNotification({
            kind: AppNotificationKind.MISSED_CALL,
            title: content.title,
            body: content.body,
            route: "/calls",
            callId: payload.callId,
          });

          notificationStore.markSourceSeen(sourceKey);
        }
      }

      useCallStore.getState().endCall(payload.reason);
      window.dispatchEvent(new CustomEvent("call:cleanup"));
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
    socket.on("group_members_added", handleGroupMembersAdded);
    socket.on("group_members_removed", handleGroupMembersRemoved);
    socket.on("group_renamed", handleGroupRenamed);
    socket.on("group_member_left", handleGroupMemberLeft);
    socket.on("group_avatar_updated", handleGroupAvatarUpdated);
    socket.on("group_avatar_deleted", handleGroupAvatarDeleted);
    socket.on("member_promoted", handleMemberPromoted);
    socket.on("member_demoted", handleMemberDemoted);
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

    // SM-1 fix: track whether this is a reconnect (not the first connect)
    let hasConnectedOnce = false;

    const handleConnect = () => {
      syncPresence();

      if (hasConnectedOnce) {
        // This is a REconnect — re-fetch conversations to pick up
        // any messages that arrived while the socket was disconnected.
        useConversationStore.getState().fetchConversations();

        // MAJ-7: Backfill missed messages for the currently open conversation.
        // Without this, the conversation list updates but the open chat's
        // message list has a gap for the disconnected period.
        const activeConvId =
          useNotificationStore.getState().activeConversationId;
        if (activeConvId) {
          const msgState = useMessageStore.getState();
          const ids = msgState.idsByConversation[activeConvId] ?? [];
          const lastMessageId = ids.length > 0 ? ids[ids.length - 1] : undefined;

          socket.emit(
            "sync_messages",
            { conversationId: activeConvId, lastMessageId, limit: 50 },
            (res) => {
              if (!res.success || !("data" in res)) return;
              const messages = res.data as MessageDto[];
              const store = useMessageStore.getState();
              for (const msg of messages) {
                if (!store.byId[msg._id]) {
                  store.addMessage(msg);
                }
              }
            },
          );
        }
      }
      hasConnectedOnce = true;
    };

    // Fire on every socket (re)connect.
    socket.on("connect", handleConnect);

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
    if (socket.connected) handleConnect();
    // ─────────────────────────────────────────────────────────────────

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("group_created", handleGroupCreated);
      socket.off("group_members_added", handleGroupMembersAdded);
      socket.off("group_members_removed", handleGroupMembersRemoved);
      socket.off("group_renamed", handleGroupRenamed);
      socket.off("group_member_left", handleGroupMemberLeft);
      socket.off("group_avatar_updated", handleGroupAvatarUpdated);
      socket.off("group_avatar_deleted", handleGroupAvatarDeleted);
      socket.off("member_promoted", handleMemberPromoted);
      socket.off("member_demoted", handleMemberDemoted);
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

      socket.off("connect", handleConnect);
      unsubConversations();
    };
  }, [isAuthenticated, accessToken]);
};
