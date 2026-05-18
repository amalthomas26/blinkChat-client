export type CallType = "audio" | "video";

export type CallDirection = "outgoing" | "incoming";

export type CallPhase =
  | "idle"
  | "outgoing_ringing"
  | "incoming_ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "failed";

export type ConnectionQuality = "good" | "fair" | "poor";

export interface MediaState {
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  remoteAudioEnabled: boolean;
  remoteVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;
  isScreenSharing: boolean;
}

export interface CallStoreState {
  callId: string | null;
  peerId: string | null;
  peerName: string | null;
  peerAvatar: string | null;
  callType: CallType | null;
  direction: CallDirection | null;
  phase: CallPhase;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  remoteAudioEnabled: boolean;
  remoteVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;
  isScreenSharing: boolean;
  connectionQuality: ConnectionQuality | null;
  endReason: string | null;
  reconnectAttempts: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export interface CallStoreActions {
  startOutgoingCall: (params: {
    callId: string;
    peerId: string;
    peerName: string;
    peerAvatar: string;
    callType: CallType;
  }) => void;
  receiveIncomingCall: (params: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callType: CallType;
  }) => void;
  setPeerRinging: () => void;
  setConnecting: () => void;
  setConnected: () => void;
  setReconnecting: () => void;
  setFailed: (reason: string) => void;
  endCall: (reason?: string) => void;
  toggleLocalAudio: () => void;
  toggleLocalVideo: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  setScreenSharing: (active: boolean) => void;
  setRemoteAudioEnabled: (enabled: boolean) => void;
  setRemoteVideoEnabled: (enabled: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setConnectionQuality: (quality: ConnectionQuality | null) => void;
  incrementReconnectAttempts: () => number;
  reset: () => void;
}

export type CallStore = CallStoreState & CallStoreActions;

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceConfigDto {
  iceServers: IceServer[];
  iceTransportPolicy: RTCIceTransportPolicy;
}

export interface CallIncomingPayload {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callType: CallType;
  createdAt: string;
}

export interface CallAcceptedPayload {
  callId: string;
  acceptedAt: string;
}

export interface CallRejectedPayload {
  callId: string;
  rejectedAt: string;
}

export interface CallEndedPayload {
  callId: string;
  reason:
    | "ended"
    | "missed"
    | "rejected"
    | "cancelled"
    | "busy"
    | "error"
    | "failed";
  endedAt: string;
  duration: number | null;
}

export interface CallReconnectingPayload {
  callId: string;
  reconnectingUserId: string;
  timeoutSeconds: number;
}

export interface CallFailedPayload {
  callId: string;
  reason: string;
  failedAt: string;
}

export interface WebRTCOfferPayload {
  callId: string;
  sdp: string;
}

export interface WebRTCAnswerPayload {
  callId: string;
  sdp: string;
}

export interface WebRTCIceCandidatePayload {
  callId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCRestartIcePayload {
  callId: string;
  userId: string;
}
