import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  SwitchCamera,
} from "../ui/icons";

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isVideoCall: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

function ControlButton({
  onClick,
  active,
  danger,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  let bgClass = "bg-white/10 hover:bg-white/20 text-white";
  if (active === false) {
    bgClass = "bg-white/20 hover:bg-white/30 text-rose-300";
  }
  if (danger) {
    bgClass = "bg-rose-600 hover:bg-rose-500 text-white";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center rounded-full transition-all duration-200 active:scale-95
        h-12 w-12 sm:h-14 sm:w-14 ${bgClass}`}
    >
      {children}
    </button>
  );
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isSpeakerOn,
  isVideoCall,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-3 py-4 sm:gap-4 sm:px-4 sm:py-6 md:gap-6">
      <ControlButton
        onClick={onToggleAudio}
        active={isAudioEnabled}
        label={isAudioEnabled ? "Mute" : "Unmute"}
      >
        {isAudioEnabled ? (
          <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </ControlButton>

      {isVideoCall ? (
        <ControlButton
          onClick={onToggleVideo}
          active={isVideoEnabled}
          label={isVideoEnabled ? "Camera off" : "Camera on"}
        >
          {isVideoEnabled ? (
            <Video className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </ControlButton>
      ) : null}

      <ControlButton onClick={onEndCall} danger label="End call">
        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
      </ControlButton>

      <ControlButton
        onClick={onToggleSpeaker}
        active={isSpeakerOn}
        label={isSpeakerOn ? "Speaker off" : "Speaker on"}
      >
        {isSpeakerOn ? (
          <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </ControlButton>

      {isVideoCall ? (
        <ControlButton onClick={onSwitchCamera} active label="Switch camera">
          <SwitchCamera className="h-5 w-5 sm:h-6 sm:w-6" />
        </ControlButton>
      ) : null}
    </div>
  );
}
