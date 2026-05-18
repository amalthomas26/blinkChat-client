import { useEffect, useRef } from "react";

interface VideoRendererProps {
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isMuted?: boolean; // true for local video (prevent echo)
  isMirrored?: boolean; // true for local front camera
  peerName?: string;
  peerAvatar?: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function VideoRenderer({
  stream,
  isVideoEnabled,
  isMuted = false,
  isMirrored = false,
  peerName = "",
  peerAvatar = "",
  className = "",
}: VideoRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach the MediaStream to the <video> element.
  // srcObject is NOT a JSX attribute — you must set it via ref.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      // Only reassign srcObject if the stream actually changed.
      // Redundant assignments trigger a new "load" that cancels any
      // in-progress play() and causes a black frame.
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  const showVideo = stream && isVideoEnabled;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-[#0a0e17] ${className}`}
      style={{ position: className.includes("absolute") ? "absolute" : "relative" }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        // Use onLoadedMetadata instead of manual play() to avoid
        // "play() interrupted by a new load request" errors.
        onLoadedMetadata={(e) => {
          (e.target as HTMLVideoElement).play().catch(() => {});
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          showVideo ? "opacity-100" : "opacity-0"
        } ${isMirrored ? "scale-x-[-1]" : ""}`}
      />

      {/* Audio-only / no-video placeholder */}
      <div
        className={`flex flex-col items-center gap-2 px-4 transition-opacity duration-300 sm:gap-3 ${
          showVideo ? "opacity-0" : "opacity-100"
        }`}
      >
        {peerAvatar ? (
          <img
            src={peerAvatar}
            alt={peerName}
            className="h-20 w-20 rounded-full border-2 border-white/10 object-cover sm:h-24 sm:w-24 md:h-32 md:w-32"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2247] text-2xl font-bold text-[#c4b5fd] sm:h-24 sm:w-24 sm:text-3xl md:h-32 md:w-32 md:text-4xl">
            {getInitials(peerName || "?")}
          </div>
        )}
        {peerName ? (
          <p className="max-w-[200px] truncate text-base font-medium text-white/80 sm:max-w-none sm:text-lg">{peerName}</p>
        ) : null}
      </div>
    </div>
  );
}
