import {useCallback} from  "react";
import {socketService} from "../services/socket.service";
import {useCallStore} from "../store/call.store";
import type {CallType} from "../types/call.types";

// Stable module-level reference — useCallStore never changes between renders.
const store = useCallStore;

export function useCallActions() {

  const initiateCall = useCallback(
    (peerId: string, peerName: string, peerAvatar: string, callType: CallType) => {
      const socket = socketService.getSocket();
      if (!socket) return;

      // Guard: already in a call
      if (store.getState().phase !== "idle") return;

      socket.emit(
        "call:initiate",
        { receiverId: peerId, callType },
        (response) => {
          if ("error" in response) {
            console.error("[call:initiate]", response.error);
            alert(response.error || "Failed to initiate call");
            return;
          }
          store.getState().startOutgoingCall({
            callId: response.data.callId,
            peerId,
            peerName,
            peerAvatar,
            callType,
          });
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store],
  );

  const acceptCall = useCallback(async () => {
    const { callId, callType } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket || !callType) return;

    // ── Request camera/mic HERE, inside the user-gesture handler. ──
    // Some mobile browsers (Safari, Firefox for Android) block getUserMedia
    // when called from a socket event (non-user-gesture). By acquiring media
    // now, we guarantee the permission prompt fires while the user tapped
    // Accept, and the stream is ready before the WebRTC offer arrives.
    try {
      const { acquireMediaForCall } = await import("../hooks/useWebRTC");
      const stream = await acquireMediaForCall(callType === "video");
      store.getState().setLocalStream(stream);
    } catch (err) {
      console.error("[acceptCall] media acquisition failed:", err);
      // Still proceed — handleOffer will try again and show a proper error
    }

    socket.emit("call:accept", { callId }, (response) => {
      if ("error" in response) {
        console.error("[call:accept]", response.error);
        return;
      }
      store.getState().setConnecting();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const rejectCall = useCallback(() => {
    const { callId } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket) return;

    socket.emit("call:reject", { callId });
    store.getState().endCall("Call rejected");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const endCall = useCallback(() => {
    const { callId } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket) return;

    socket.emit("call:end", { callId });
    store.getState().endCall("Call ended");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  return { initiateCall, acceptCall, rejectCall, endCall };
}

