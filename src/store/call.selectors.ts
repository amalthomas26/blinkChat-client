import { useShallow } from "zustand/react/shallow";
import { useCallStore } from "./call.store";
import type {
  CallPhase,
  ConnectionQuality,
  CallType,
} from "../types/call.types";

export const useCallPhase = (): CallPhase => useCallStore((s) => s.phase);

export const useIsInCall = (): boolean =>
  useCallStore((s) => s.phase !== "idle");

export const useIsCallActive = (): boolean =>
  useCallStore(
    (s) =>
      s.phase === "connecting" ||
      s.phase === "connected" ||
      s.phase === "reconnecting",
  );

export const useCallId = (): string | null => useCallStore((s) => s.callId);

export const useCallType = (): CallType | null =>
  useCallStore((s) => s.callType);

export const useCallPeer = () =>
  useCallStore(
    useShallow((s) => ({
      peerId: s.peerId,
      peerName: s.peerName,
      peerAvatar: s.peerAvatar,
    })),
  );

export const useCallDirection = () => useCallStore((s) => s.direction);

export const useCallMediaState = () =>
  useCallStore(
    useShallow((s) => ({
      localAudioEnabled: s.localAudioEnabled,
      localVideoEnabled: s.localVideoEnabled,
      remoteAudioEnabled: s.remoteAudioEnabled,
      remoteVideoEnabled: s.remoteVideoEnabled,
      isSpeakerOn: s.isSpeakerOn,
      isFrontCamera: s.isFrontCamera,
      isScreenSharing: s.isScreenSharing,
    })),
  );

export const useLocalStream = (): MediaStream | null =>
  useCallStore((s) => s.localStream);

export const useRemoteStream = (): MediaStream | null =>
  useCallStore((s) => s.remoteStream);

export const useConnectionQuality = (): ConnectionQuality | null =>
  useCallStore((s) => s.connectionQuality);

export const useCallEndReason = (): string | null =>
  useCallStore((s) => s.endReason);

export const useReconnectAttempts = (): number =>
  useCallStore((s) => s.reconnectAttempts);
