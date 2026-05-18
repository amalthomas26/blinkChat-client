import {useCallback} from  "react";
import {socketService} from "../services/socket.service";
import {useCallStore} from "../store/call.store";
import type {CallType} from "../types/call.types";

export function useCallActions() {
  const store = useCallStore;

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
    [],
  );

  const acceptCall = useCallback(() => {
    const { callId } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket) return;

    socket.emit("call:accept", { callId }, (response) => {
      if ("error" in response) {
        console.error("[call:accept]", response.error);
        return;
      }
      store.getState().setConnecting();
    });
  }, []);

  const rejectCall = useCallback(() => {
    const { callId } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket) return;

    socket.emit("call:reject", { callId });
    store.getState().endCall("Call rejected");
  }, []);

  const endCall = useCallback(() => {
    const { callId } = store.getState();
    const socket = socketService.getSocket();
    if (!callId || !socket) return;

    socket.emit("call:end", { callId });
    store.getState().endCall("Call ended");
  }, []);

  return { initiateCall, acceptCall, rejectCall, endCall };
}

