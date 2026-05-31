import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "../store/call.store";
import { callService } from "../services/call.service";
import { socketService } from "../services/socket.service";
import type { IceConfigDto, ConnectionQuality } from "../types/call.types";

const MAX_RECONNECT_ATTEMPTS = 3;
const ICE_DISCONNECT_TIMEOUT_MS = 3000;
const STATS_POLL_INTERVAL_MS = 4000;
const MAX_BITRATE_BPS = 2_500_000; // 2.5 Mbps for 1080p

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const MEDIA_CONSTRAINTS: MediaStreamConstraints[] = [
  { video: { width: 1920, height: 1080, frameRate: 30 }, audio: AUDIO_CONSTRAINTS },
  { video: { width: 1280, height: 720, frameRate: 30 }, audio: AUDIO_CONSTRAINTS },
  { video: { width: 640, height: 480, frameRate: 30 }, audio: AUDIO_CONSTRAINTS },
  { video: true, audio: AUDIO_CONSTRAINTS },
  { video: false, audio: AUDIO_CONSTRAINTS }, // audio-only fallback
];

async function acquireMedia(wantVideo: boolean): Promise<MediaStream> {
  const ladder = wantVideo
    ? MEDIA_CONSTRAINTS
    : [{ video: false, audio: AUDIO_CONSTRAINTS }];

  for (const constraints of ladder) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (err instanceof OverconstrainedError) continue;

      // Camera is locked by another app/browser — fall back to audio-only.
      // This commonly happens when testing two browsers on the same machine.
      if (
        err instanceof DOMException &&
        err.name === "NotReadableError" &&
        wantVideo
      ) {
        console.warn("[acquireMedia] Camera in use, falling back to audio-only");
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: AUDIO_CONSTRAINTS,
          });
        } catch {
          throw err; // mic also failed — re-throw original
        }
      }

      throw err;
    }
  }
  throw new Error("No media device available");
}

// Exported so useCallActions can call getUserMedia inside the Accept button's
// user-gesture handler, guaranteeing the permission prompt on mobile browsers.
export { acquireMedia as acquireMediaForCall };

function deriveQuality(stats: RTCStatsReport): ConnectionQuality {
  let packetLossRate = 0;
  let jitter = 0;
  let rtt = 0;

  stats.forEach((report) => {
    if (report.type === "inbound-rtp" && report.kind === "video") {
      const lost = report.packetsLost ?? 0;
      const received = report.packetsReceived ?? 1;
      packetLossRate = lost / (lost + received);
      jitter = report.jitter ?? 0;
    }
    if (report.type === "candidate-pair" && report.state === "succeeded") {
      rtt = report.currentRoundTripTime ?? 0;
    }
  });

  if (packetLossRate > 0.05 || rtt > 0.4 || jitter > 0.1) return "poor";
  if (packetLossRate > 0.02 || rtt > 0.2 || jitter > 0.05) return "fair";
  return "good";
}

async function capBitrate(pc: RTCPeerConnection): Promise<void> {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) continue;
    params.encodings[0].maxBitrate = MAX_BITRATE_BPS;
    await sender.setParameters(params);
  }
}

// Stable module-level reference — useCallStore.getState never changes between renders,
// so placing it at module scope satisfies useCallback dependency arrays without
// causing infinite re-renders.
const getStore = () => useCallStore.getState();

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceConfigRef = useRef<IceConfigDto | null>(null);

  const cleanup = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    const localStream = getStore().localStream;
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop()); // stops camera light
      getStore().setLocalStream(null);
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.ontrack = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    iceCandidateQueue.current = [];
    iceConfigRef.current = null;
    getStore().setRemoteStream(null);
    getStore().setConnectionQuality(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore]);

  // renegotiate is declared BEFORE createPC so the ICE state handler
  // inside createPC can reference it without a temporal dead zone error.
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    const { callId } = getStore();
    const socket = socketService.getSocket();
    if (!pc || !callId || !socket) return;

    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    socket.emit("webrtc:offer", { callId, sdp: offer.sdp! });
 
  }, [getStore]);

  const createPC = useCallback(async (): Promise<RTCPeerConnection> => {
    // Fetch ICE config once per call (credentials are time-limited)
    if (!iceConfigRef.current) {
      iceConfigRef.current = await callService.fetchIceConfig();
    }

    const pc = new RTCPeerConnection({
      iceServers: iceConfigRef.current.iceServers,
      iceTransportPolicy: iceConfigRef.current.iceTransportPolicy,
    });

    // ICE Candidate Trickle
    pc.onicecandidate = (event) => {
      if (!event.candidate) return; // gathering complete
      const { callId } = getStore();
      const socket = socketService.getSocket();
      if (!callId || !socket) return;

      socket.emit("webrtc:ice-candidate", {
        callId,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[ICE]", state);

      if (state === "connected" || state === "completed") {
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        getStore().setConnected();
      }
      if (state === "disconnected") {
        disconnectTimerRef.current = setTimeout(() => {
          const currentPhase = getStore().phase;
          if (currentPhase === "connected" || currentPhase === "reconnecting") {
            const attempts = getStore().incrementReconnectAttempts();
            if (attempts > MAX_RECONNECT_ATTEMPTS) {
              getStore().setFailed("Connection lost");
              cleanup();
              return;
            }
            getStore().setReconnecting();
            pc.restartIce();
            renegotiate();
          }
        }, ICE_DISCONNECT_TIMEOUT_MS);
      }

      if (state === "failed") {
        getStore().setFailed("Connection failed");
        cleanup();
      }
    };

    pc.ontrack = (event) => {
      // event.streams[0] contains both audio + video tracks from the peer
      if (event.streams[0]) {
        getStore().setRemoteStream(event.streams[0]);
      }
    };

    statsIntervalRef.current = setInterval(async () => {
      if (
        pc.iceConnectionState !== "connected" &&
        pc.iceConnectionState !== "completed"
      )
        return;
      try {
        const stats = await pc.getStats();
        const quality = deriveQuality(stats);
        getStore().setConnectionQuality(quality);
      } catch { /* stats poll failed silently */ }
    }, STATS_POLL_INTERVAL_MS);

    pcRef.current = pc;
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, renegotiate, getStore]);

  const startCall = useCallback(async () => {
    const { callType, callId } = getStore();
    console.log("[startCall] type:", callType, "callId:", callId);
    if (!callType || !callId) return;

    const socket = socketService.getSocket();
    if (!socket) { console.error("[startCall] no socket"); return; }

    try {
      console.log("[startCall] acquiring media...");
      const stream = await acquireMedia(callType === "video");
      getStore().setLocalStream(stream);

      console.log("[startCall] creating PeerConnection...");
      const pc = await createPC();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await capBitrate(pc);

      console.log("[startCall] creating offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc:offer", { callId, sdp: offer.sdp! });
      console.log("[startCall] offer sent");
    } catch (err) {
      console.error("[startCall] FAILED:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        getStore().setFailed("Camera/mic permission denied");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        getStore().setFailed("No camera or microphone found");
      } else {
        getStore().setFailed("Failed to start call");
      }
      cleanup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPC, cleanup, getStore]);

  const handleOffer = useCallback(
    async (sdp: string) => {
      const { callType, callId } = getStore();
      console.log("[handleOffer] type:", callType, "callId:", callId);
      if (!callType || !callId) { console.error("[handleOffer] no callType/callId"); return; }

      const socket = socketService.getSocket();
      if (!socket) { console.error("[handleOffer] no socket"); return; }

      try {
        // Reuse existing stream if this is a renegotiation (ICE restart)
        const existingStream = getStore().localStream;
        console.log("[handleOffer] acquiring media...");
        const stream = existingStream ?? (await acquireMedia(callType === "video"));
        if (!existingStream) getStore().setLocalStream(stream);

        console.log("[handleOffer] creating PeerConnection...");
        const pc = pcRef.current ?? (await createPC());

        // Only add tracks on the first offer, not on ICE restart renegotiations
        if (pc.getSenders().length === 0) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp }),
        );

        for (const candidate of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidateQueue.current = [];

        await capBitrate(pc);

        console.log("[handleOffer] creating answer...");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", { callId, sdp: answer.sdp! });
        console.log("[handleOffer] answer sent");
      } catch (err) {
        console.error("[handleOffer] FAILED:", err);
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          getStore().setFailed("Camera/mic permission denied");
        } else if (
          err instanceof DOMException &&
          err.name === "NotFoundError"
        ) {
          getStore().setFailed("No camera or microphone found");
        } else {
          getStore().setFailed("Failed to connect");
        }
        cleanup();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createPC, cleanup, getStore],
  );

  const handleAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp }),
      );

      for (const candidate of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidateQueue.current = [];
    } catch (err) {
      console.error("[handleAnswer]", err);
      getStore().setFailed("Failed to process answer");
      cleanup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, getStore]);

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current;

      if (!pc || !pc.remoteDescription) {
        iceCandidateQueue.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    },
    [],
  );



  // ─── Toggle Local Audio Track ─────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const stream = getStore().localStream;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      getStore().toggleLocalAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore]);

  const toggleVideo = useCallback(() => {
    const stream = getStore().localStream;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      getStore().toggleLocalVideo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore]);

  const switchCamera = useCallback(async () => {
    const pc = pcRef.current;
    const stream = getStore().localStream;
    if (!pc || !stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;

    const isFront = getStore().isFrontCamera;
    const newFacing = isFront ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];

      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);

      stream.removeTrack(oldTrack);
      oldTrack.stop();
      stream.addTrack(newTrack);

      getStore().toggleCamera();
    } catch (err) {
      console.warn("[switchCamera] failed:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore]);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    const handler = () => {
      const stream = getStore().localStream;
      if (!stream) return;
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;

      if (document.hidden) {
        videoTrack.enabled = false;
      } else {
        videoTrack.enabled = getStore().localVideoEnabled;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore]);

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    switchCamera,
    cleanup,
  };
}
