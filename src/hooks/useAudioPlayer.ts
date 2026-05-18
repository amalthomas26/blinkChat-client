import { useSyncExternalStore } from "react";

// One global audio element for the whole app — only one audio plays at a time.
const audioEl = new Audio();

interface AudioPlayerState {
  src: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
}

let state: AudioPlayerState = {
  src: null,
  playing: false,
  currentTime: 0,
  duration: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AudioPlayerState {
  return state;
}

audioEl.addEventListener("timeupdate", () => {
  state = { ...state, currentTime: audioEl.currentTime };
  emitChange();
});
audioEl.addEventListener("durationchange", () => {
  state = { ...state, duration: audioEl.duration };
  emitChange();
});
audioEl.addEventListener("ended", () => {
  state = { ...state, playing: false, currentTime: 0 };
  emitChange();
});
audioEl.addEventListener("pause", () => {
  state = { ...state, playing: false };
  emitChange();
});
audioEl.addEventListener("play", () => {
  state = { ...state, playing: true };
  emitChange();
});

export function useAudioPlayer(src: string) {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  const isActive = snap.src === src;

  function toggle() {
    if (!isActive) {
      audioEl.src = src;
      state = { ...state, src, currentTime: 0, duration: 0 };
      emitChange();
      void audioEl.play();
    } else if (snap.playing) {
      audioEl.pause();
    } else {
      void audioEl.play();
    }
  }

  function seek(time: number) {
    if (isActive) audioEl.currentTime = time;
  }

  return {
    isActive,
    playing: isActive && snap.playing,
    currentTime: isActive ? snap.currentTime : 0,
    duration: isActive ? snap.duration : 0,
    toggle,
    seek,
  };
}
