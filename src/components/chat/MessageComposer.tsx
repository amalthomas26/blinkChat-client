import { Image, Mic, Paperclip, Send, Smile, X } from "../ui/icons";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  MessageType,
  type MessageDto,
  type MessageSendDraft,
} from "../../types";
import { ReactionPicker } from "./ReactionPicker";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { getMessageTypeFromFile } from "../../lib/media";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { lazy, Suspense } from "react";
const AudioRecordingBar = lazy(() => import("./AudioRecordingBar").then(m => ({ default: m.AudioRecordingBar })));

interface MessageComposerProps {
  conversationId: string;
  replyTo: MessageDto | null;
  onCancelReply: () => void;
  onSend: (draft: MessageSendDraft) => Promise<void>;
}

export function MessageComposer({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null,
  );

  const recorder = useAudioRecorder();
  const { startTyping, stopTyping } = useTypingIndicator(conversationId);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const stageFile = useCallback((file: File) => {
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
  }, []);

  const clearPendingFile = useCallback(() => {
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(null);
  }, []);

  const sendText = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend({
        conversationId,
        type: MessageType.TEXT,
        content: trimmed,
        replyTo: replyTo?._id,
      });
      setContent("");
      stopTyping();
      onCancelReply();
    } finally {
      setIsSending(false);
    }
  }, [
    content,
    conversationId,
    isSending,
    onCancelReply,
    onSend,
    replyTo?._id,
    stopTyping,
  ]);

  const sendMedia = useCallback(async () => {
    if (!pendingFile || isSending) return;

    const fileToSend = pendingFile;
    const captionToSend = content.trim() || undefined;

    setContent("");
    clearPendingFile();
    stopTyping();
    onCancelReply();

    setIsSending(true);
    try {
      await onSend({
        conversationId,
        type: getMessageTypeFromFile(fileToSend),
        file: fileToSend,
        content: captionToSend,
        replyTo: replyTo?._id,
      });
    } finally {
      setIsSending(false);
    }
  }, [
    clearPendingFile,
    content,
    conversationId,
    isSending,
    onCancelReply,
    onSend,
    pendingFile,
    replyTo?._id,
    stopTyping,
  ]);

  const sendDirect = useCallback(
    async (file: File, audioDuration?: number) => {
      if (isSending) return;

      setIsSending(true);
      try {
        await onSend({
          conversationId,
          type: getMessageTypeFromFile(file),
          file,
          audioDuration,
          replyTo: replyTo?._id,
        });
        onCancelReply();
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, isSending, onCancelReply, onSend, replyTo?._id],
  );

  const sendVoiceNote = useCallback(async () => {
    if (isSending) return;
    try {
      // stopAndGetFile awaits the onstop event — the File is guaranteed ready.
      const { file, audioDuration } = await recorder.stopAndGetFile();
      await sendDirect(file, audioDuration);
    } catch (err) {
      // Log so voice-note failures are never silently swallowed.
      console.error("[sendVoiceNote] failed:", err);
    } finally {
      recorder.cancel(); // resets state to idle
    }
  }, [isSending, recorder, sendDirect]);

  const handleFileChosen = (file: File) => {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      stageFile(file);
    } else {
      void sendDirect(file);
    }
  };

  const isMediaPending = pendingFile !== null;
  const isRecording = recorder.status === "recording";
  const canSend =
    isRecording ||
    isMediaPending ||
    content.trim().length > 0 ||
    !!recorder.recordedFile;

  const handleSend = () => {
    if (isRecording) void sendVoiceNote();
    else if (pendingFile) void sendMedia();
    else void sendText();
  };

  return (
    <footer className="shrink-0 border-t border-[#273244] bg-[#151b2b] px-2 py-3 md:px-4">
      {replyTo ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border-l-2 border-[#8b5cf6] bg-[#101620] px-4 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#c4b5fd]">Replying</p>
            <p className="truncate text-sm text-slate-300">
              {replyTo.content ?? replyTo.type.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {isRecording ? (
        <div className="mb-3">
          <Suspense fallback={<div className="h-11 w-full rounded-full bg-[#1d2635]" />}>
            <AudioRecordingBar
              elapsedSeconds={recorder.elapsedSeconds}
              onCancel={recorder.cancel}
              onSend={() => void sendVoiceNote()}
            />
          </Suspense>
        </div>
      ) : null}

      {isMediaPending && pendingPreviewUrl ? (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[#273244] bg-[#101620] p-3">
          <div className="relative shrink-0">
            {pendingFile!.type.startsWith("video/") ? (
              <video
                src={pendingPreviewUrl}
                className="h-20 w-20 rounded-xl object-cover"
                muted
                preload="metadata"
              />
            ) : (
              <img
                src={pendingPreviewUrl}
                alt="Preview"
                className="h-20 w-20 rounded-xl object-cover"
              />
            )}
            <button
              type="button"
              onClick={clearPendingFile}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-sm font-medium text-slate-200">
              {pendingFile!.name}
            </p>
            <p className="text-xs text-slate-500">
              {pendingFile!.type.startsWith("video/") ? "Video" : "Image"} ·{" "}
              {(pendingFile!.size / 1024).toFixed(0)} KB
            </p>
            <p className="mt-2 text-xs text-[#a78bfa]">
              Add a caption below, then press Send ↵
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative flex items-center gap-1 md:gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/webm,audio/mp4,audio/mpeg,audio/wav,application/pdf,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileChosen(file);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) stageFile(file);
            event.currentTarget.value = "";
          }}
        />

        {isRecording ? null : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        )}

        {isRecording ? null : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
          >
            <Image className="h-5 w-5" />
          </button>
        )}

        <input
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (event.target.value.trim()) startTyping();
            else stopTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          onPaste={(event) => {
            const items = event.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (
                item.type.startsWith("image/") ||
                item.type.startsWith("video/")
              ) {
                const file = item.getAsFile();
                if (file) {
                  event.preventDefault();
                  stageFile(file);
                  break;
                }
              }
            }
          }}
          placeholder={
            isMediaPending ? "Add a caption..." : "Type a message..."
          }
          className="h-11 min-w-0 flex-1 rounded-xl bg-[#1d2635] px-4 text-sm text-white outline-none placeholder:text-slate-400"
        />

        {isRecording ? null : (
          <button
            type="button"
            onClick={() => setIsEmojiOpen((v) => !v)}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
        )}

        {isRecording ? null : (
          <button
            type="button"
            onClick={() => void recorder.start()}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
            title="Record voice note"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          disabled={!canSend || isSending}
          onClick={handleSend}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#8b5cf6] text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>

        {isEmojiOpen ? (
          <div className="absolute bottom-14 right-0 z-30">
            <ReactionPicker
              onSelect={(emoji) => {
                setContent((value) => `${value}${emoji}`);
                startTyping();
              }}
              onClose={() => setIsEmojiOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </footer>
  );
}
