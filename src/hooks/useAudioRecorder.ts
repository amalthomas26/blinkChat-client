import { useCallback, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "stopped";

interface UseAudioRecorderReturn {
  status: RecorderStatus;
  elapsedSeconds: number;
  start: () => Promise<void>;
  /** Stops recording and resolves with the recorded File + duration once onstop fires. */
  stopAndGetFile: () => Promise<{ file: File; audioDuration: number }>;
  cancel: () => void;
  recordedFile: File | null;
  audioDuration: number;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  /** Set to true by cancel() so onstop skips file creation. */
  const cancelledRef = useRef(false);
  const mimeTypeRef = useRef("audio/webm");

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const start = useCallback(async () => {
    if (status !== "idle") return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mimeTypeRef.current = mimeType;
    cancelledRef.current = false;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    // onstop fires asynchronously — don't create a file if cancelled.
    recorder.onstop = () => {
      if (cancelledRef.current) {
        cleanupStream();
        return;
      }
      // Use the base MIME type (without codec suffix) for the File so it
      // passes the exact-match validation in validateMediaFile.
      const baseMime = mimeType.split(";")[0];
      const blob = new Blob(chunksRef.current, { type: baseMime });
      const duration = (Date.now() - startTimeRef.current) / 1000;
      setAudioDuration(duration);
      setRecordedFile(
        new File([blob], `voice-note-${Date.now()}.webm`, { type: baseMime }),
      );
      cleanupStream();
    };

    startTimeRef.current = Date.now();
    recorder.start(100);
    setStatus("recording");
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [status, cleanupStream]);

  /**
   * Stops the recording and returns a Promise that resolves with the File
   * and duration once the MediaRecorder onstop event fires.
   * This is the correct way to get the file — stop() is fire-and-forget
   * but onstop is async, so you MUST await this to have the file ready.
   */
  const stopAndGetFile = useCallback(
    (): Promise<{ file: File; audioDuration: number }> =>
      new Promise((resolve, reject) => {
        const mr = mediaRecorderRef.current;
        if (!mr || mr.state === "inactive") {
          reject(new Error("No active recording"));
          return;
        }
        const mimeType = mimeTypeRef.current;
        const startTime = startTimeRef.current;
        // Override onstop for this one call so we can resolve the promise.
        mr.onstop = () => {
          if (cancelledRef.current) {
            reject(new Error("Cancelled"));
            return;
          }
          // Use the base MIME type (without codec suffix) so the file passes
          // the exact-match validation in validateMediaFile.
          const baseMime = mimeType.split(";")[0];
          const blob = new Blob(chunksRef.current, { type: baseMime });
          const duration = (Date.now() - startTime) / 1000;
          const file = new File([blob], `voice-note-${Date.now()}.webm`, {
            type: baseMime,
          });
          setAudioDuration(duration);
          setRecordedFile(file);
          cleanupStream();
          resolve({ file, audioDuration: duration });
        };
        mr.stop();
        setStatus("stopped");
      }),
    [cleanupStream],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    // Guard: only call stop() if the recorder is actively recording/paused.
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    cleanupStream();
    chunksRef.current = [];
    setRecordedFile(null);
    setStatus("idle");
    setElapsedSeconds(0);
  }, [cleanupStream]);

  return {
    status,
    elapsedSeconds,
    start,
    stopAndGetFile,
    cancel,
    recordedFile,
    audioDuration,
  };
}
