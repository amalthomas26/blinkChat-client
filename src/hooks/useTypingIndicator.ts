import { useCallback, useEffect, useRef } from "react";
import { socketService } from "../services/socket.service";

const TYPING_IDLE_MS = 1200;

export function useTypingIndicator(conversationId: string | undefined) {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit("typing_stop", { conversationId });
    isTypingRef.current = false;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      socket.emit("typing_start", { conversationId });
      isTypingRef.current = true;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_MS);
  }, [conversationId, stopTyping]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    startTyping,
    stopTyping,
  };
}
