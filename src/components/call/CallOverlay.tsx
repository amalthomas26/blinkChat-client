import { useEffect, useCallback } from "react";
import {
  useCallPhase,
  useCallType,
  useCallPeer,
  useCallDirection,
  useCallMediaState,
  useLocalStream,
  useRemoteStream,
} from "../../store/call.selectors";
import { useCallStore } from "../../store/call.store";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useCallActions } from "../../hooks/useCallActions";
import { useCallTimer, formatCallDuration } from "../../hooks/useCallTimer";
import { lazy, Suspense } from "react";
const VideoRenderer = lazy(() => import("./VideoRenderer").then(m => ({ default: m.VideoRenderer })));
const CallControls = lazy(() => import("./CallControls").then(m => ({ default: m.CallControls })));
import { ConnectionQualityBadge } from "./ConnectionQuality";
import type {
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCIceCandidatePayload,
} from "../../types/call.types";

export function CallOverlay() {
  const phase = useCallPhase();
  const callType = useCallType();
  const direction = useCallDirection();
  const { peerName, peerAvatar } = useCallPeer();
  const media = useCallMediaState();
  const localStream = useLocalStream();
  const remoteStream = useRemoteStream();
  const seconds = useCallTimer();

  const {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    switchCamera,
    cleanup,
  } = useWebRTC();

  const { endCall } = useCallActions();

  const isVideoCall = callType === "video";

  // When the caller's phase transitions to "connecting" (after receiving
  // call:accepted), we start the WebRTC offer process.

  useEffect(() => {
    console.log("[CallOverlay] phase:", phase, "direction:", direction);
    if (phase === "connecting" && direction === "outgoing") {
      console.log("[CallOverlay] triggering startCall()");
      startCall();
    }
  }, [phase, direction, startCall]);

  // useSocket dispatches these as window CustomEvents.
  // We catch them here and route to the useWebRTC hook.

  const onWebRTCOffer = useCallback(
    (e: Event) => {
      const { sdp } = (e as CustomEvent<WebRTCOfferPayload>).detail;
      handleOffer(sdp);
    },
    [handleOffer],
  );

  const onWebRTCAnswer = useCallback(
    (e: Event) => {
      const { sdp } = (e as CustomEvent<WebRTCAnswerPayload>).detail;
      handleAnswer(sdp);
    },
    [handleAnswer],
  );

  const onWebRTCIceCandidate = useCallback(
    (e: Event) => {
      const { candidate } = (e as CustomEvent<WebRTCIceCandidatePayload>)
        .detail;
      handleIceCandidate(candidate);
    },
    [handleIceCandidate],
  );


  useEffect(() => {
    window.addEventListener("webrtc:offer", onWebRTCOffer);
    window.addEventListener("webrtc:answer", onWebRTCAnswer);
    window.addEventListener("webrtc:ice-candidate", onWebRTCIceCandidate);

    // Immediate cleanup when server signals call ended/rejected/failed.
    // This runs synchronously before React re-renders, preventing the
    // ICE disconnect handler from starting reconnection logic.
    const onCallCleanup = () => cleanup();
    window.addEventListener("call:cleanup", onCallCleanup);

    return () => {
      window.removeEventListener("webrtc:offer", onWebRTCOffer);
      window.removeEventListener("webrtc:answer", onWebRTCAnswer);
      window.removeEventListener("webrtc:ice-candidate", onWebRTCIceCandidate);
      window.removeEventListener("call:cleanup", onCallCleanup);
    };
  }, [onWebRTCOffer, onWebRTCAnswer, onWebRTCIceCandidate, cleanup]);

  const handleEndCall = useCallback(() => {
    endCall();
    cleanup();
  }, [endCall, cleanup]);

  useEffect(() => {
    if (phase === "ended" || phase === "failed") {
      cleanup();
    }
  }, [phase, cleanup]);

  const statusText =
    phase === "outgoing_ringing"
      ? "Ringing…"
      : phase === "connecting"
        ? "Connecting…"
        : phase === "reconnecting"
          ? "Reconnecting…"
          : phase === "connected"
            ? formatCallDuration(seconds)
            : phase === "failed"
              ? "Call Failed"
              : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0a0e17]"
      style={{
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Top bar — status + timer */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4 md:px-6">
        <ConnectionQualityBadge />
        <div className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-sm">
          {statusText}
        </div>
      </div>

      {/* Main video area — fills remaining space */}
      <div className="relative flex flex-1 items-center justify-center">
        <Suspense fallback={<div className="absolute inset-0 bg-black/50" />}>
          <VideoRenderer
            stream={remoteStream}
            isVideoEnabled={isVideoCall && media.remoteVideoEnabled}
            peerName={peerName ?? ""}
            peerAvatar={peerAvatar ?? ""}
            className="absolute inset-0"
          />
        </Suspense>

        {isVideoCall && localStream ? (
          <div className="absolute bottom-20 right-3 z-10 h-28 w-20 overflow-hidden rounded-xl border-2 border-white/10 shadow-xl sm:bottom-24 sm:right-4 sm:h-36 sm:w-24 md:bottom-28 md:right-6 md:h-48 md:w-36">
            <Suspense fallback={<div className="h-full w-full bg-black/50" />}>
              <VideoRenderer
                stream={localStream}
                isVideoEnabled={media.localVideoEnabled}
                isMuted
                isMirrored={media.isFrontCamera}
                className="h-full w-full"
              />
            </Suspense>
          </div>
        ) : null}

        {/* Reconnecting overlay */}
        {phase === "reconnecting" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#8b5cf6]" />
            <p className="text-base font-medium text-white sm:text-lg">Reconnecting…</p>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Please wait, restoring connection
            </p>
          </div>
        ) : null}

        {/* Failed overlay */}
        {phase === "failed" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600/20 sm:h-16 sm:w-16">
              <span className="text-2xl sm:text-3xl">✕</span>
            </div>
            <p className="text-base font-medium text-white sm:text-lg">Call Failed</p>
            <p className="mt-1 text-center text-xs text-slate-400 sm:text-sm">
              Connection could not be established
            </p>
            <button
              type="button"
              onClick={() => useCallStore.getState().reset()}
              className="mt-5 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 active:scale-95 sm:mt-6 sm:px-6"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>

      {/* Controls bar at bottom */}
      <div className="shrink-0 bg-gradient-to-t from-black/60 to-transparent">
        <Suspense fallback={<div className="h-20 w-full" />}>
          <CallControls
            isAudioEnabled={media.localAudioEnabled}
            isVideoEnabled={media.localVideoEnabled}
            isSpeakerOn={media.isSpeakerOn}
            isVideoCall={isVideoCall}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleSpeaker={() => {
              useCallStore.getState().toggleSpeaker();
            }}
            onSwitchCamera={switchCamera}
            onEndCall={handleEndCall}
          />
        </Suspense>
      </div>
    </div>
  );
}
