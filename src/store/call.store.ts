import { create } from "zustand";
import type { CallStore, CallStoreState, CallPhase } from "../types/call.types";

// This map defines which phases can transition to which other phases.
// If a transition is not in this map, it's a bug and we silently reject it.
// This prevents impossible states like "ended → connecting".
//

const VALID_TRANSITIONS: Record<CallPhase, CallPhase[]> = {
  idle: ["outgoing_ringing", "incoming_ringing"],
  outgoing_ringing: ["connecting", "ended", "failed"],
  incoming_ringing: ["connecting", "ended", "failed"],
  connecting: ["connected", "ended", "failed"],
  connected: ["reconnecting", "ended", "failed"],
  reconnecting: ["connected", "ended", "failed"],
  ended: ["idle"],
  failed: ["idle"],
};

function canTransition(from: CallPhase, to: CallPhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

const initialState: CallStoreState = {
  callId: null,
  peerId: null,
  peerName: null,
  peerAvatar: null,
  callType: null,
  direction: null,

  phase: "idle",

  localAudioEnabled: true,
  localVideoEnabled: true,
  remoteAudioEnabled: true,
  remoteVideoEnabled: true,
  isSpeakerOn: true,
  isFrontCamera: true,
  isScreenSharing: false,

  connectionQuality: null,
  endReason: null,
  reconnectAttempts: 0,

  localStream: null,
  remoteStream: null,
};

export const useCallStore = create<CallStore>()((set, get) => ({
  ...initialState,

  startOutgoingCall: ({ callId, peerId, peerName, peerAvatar, callType }) => {
    const { phase } = get();

    if (!canTransition(phase, "outgoing_ringing")) return;

    set({
      callId,
      peerId,
      peerName,
      peerAvatar,
      callType,
      direction: "outgoing",
      phase: "outgoing_ringing",
      localVideoEnabled: callType === "video",
      endReason: null,
      reconnectAttempts: 0,
    });
  },

  receiveIncomingCall: ({
    callId,
    callerId,
    callerName,
    callerAvatar,
    callType,
  }) => {
    const { phase } = get();
    if (phase !== "idle") return; // Already in a call — don't accept another

    set({
      callId,
      peerId: callerId,
      peerName: callerName,
      peerAvatar: callerAvatar,
      callType,
      direction: "incoming",
      phase: "incoming_ringing",
      localVideoEnabled: callType === "video",
      endReason: null,
      reconnectAttempts: 0,
    });
  },

  setPeerRinging: () => {
    // Confirmation that the receiver's device is ringing.
    // We stay in outgoing_ringing — no phase change needed.
  },
  setConnecting: () => {
    const { phase } = get();
    if (!canTransition(phase, "connecting")) return;
    set({ phase: "connecting" });
  },

  setConnected: () => {
    const { phase } = get();
    if (!canTransition(phase, "connected")) return;
    set({ phase: "connected", reconnectAttempts: 0 });
  },

  setReconnecting: () => {
    const { phase } = get();
    if (!canTransition(phase, "reconnecting")) return;
    set({ phase: "reconnecting" });
  },

  setFailed: (reason: string) => {
    const { phase } = get();
    if (!canTransition(phase, "failed")) return;
    set({ phase: "failed", endReason: reason });

    // Auto-reset to idle after showing the failed state.
    // The CallOverlay's "Close" button also calls reset() immediately.
    setTimeout(() => {
      if (get().phase === "failed") {
        set({ ...initialState });
      }
    }, 5000);
  },

  endCall: (reason?: string) => {
    const { phase } = get();
    if (phase === "idle" || phase === "ended") return;
    set({ phase: "ended", endReason: reason ?? "Call ended" });

    // Auto-reset to idle so the user can receive new calls.
    // Without this, phase stays "ended" forever and receiveIncomingCall
    // silently rejects all future calls.
    setTimeout(() => {
      if (get().phase === "ended") {
        set({ ...initialState });
      }
    }, 2000);
  },

  toggleLocalAudio: () =>
    set((s) => ({ localAudioEnabled: !s.localAudioEnabled })),
  toggleLocalVideo: () =>
    set((s) => ({ localVideoEnabled: !s.localVideoEnabled })),
  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),
  toggleCamera: () => set((s) => ({ isFrontCamera: !s.isFrontCamera })),
  setScreenSharing: (active) => set({ isScreenSharing: active }),
  setRemoteAudioEnabled: (enabled) => set({ remoteAudioEnabled: enabled }),
  setRemoteVideoEnabled: (enabled) => set({ remoteVideoEnabled: enabled }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  setConnectionQuality: (quality) => set({ connectionQuality: quality }),

  incrementReconnectAttempts: () => {
    const next = get().reconnectAttempts + 1;
    set({ reconnectAttempts: next });
    return next;
  },

  reset: () => set({ ...initialState }),
}));
