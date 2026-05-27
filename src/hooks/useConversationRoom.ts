import { useEffect, useState, useCallback } from "react";
import { socketService } from "../services/socket.service";

interface UseConversationRoomResult {
  isJoined: boolean;
  joinError: string | null;
}

export function useConversationRoom(
  conversationId: string | undefined,
): UseConversationRoomResult {
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setIsJoinError] = useState<string | null>(null);

  const joinRoom = useCallback(
    (convId: string) => {
      const socket = socketService.getSocket();
      if (!socket?.connected) return;

      socket.emit("join_conversation", convId, (response) => {
        if (response.success) {
          setIsJoined(true);
          setIsJoinError(null);
        } else {
          setIsJoined(false);
          setIsJoinError(response.error ?? "Failed to join conversation");
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (!conversationId) return;

    const socket = socketService.getSocket();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsJoined(false);
    setIsJoinError(null);

    // Try joining immediately if socket is ready
    if (socket?.connected) {
      joinRoom(conversationId);
    }

    // Re-join on every (re)connect — fixes BUG-1 where room
    // membership is lost after a socket disconnect/reconnect.
    const handleConnect = () => {
      joinRoom(conversationId);
    };

    // If socket exists, listen for connect events
    if (socket) {
      socket.on("connect", handleConnect);
    }

    // If socket doesn't exist yet (BUG-6), poll briefly until it appears
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (!socket) {
      pollTimer = setInterval(() => {
        const s = socketService.getSocket();
        if (s) {
          clearInterval(pollTimer!);
          pollTimer = null;
          s.on("connect", handleConnect);
          if (s.connected) {
            joinRoom(conversationId);
          }
        }
      }, 200);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      const currentSocket = socketService.getSocket();
      if (currentSocket) {
        currentSocket.off("connect", handleConnect);
        currentSocket.emit("leave_conversation", conversationId);
      }
    };
  }, [conversationId, joinRoom]);

  return { isJoined, joinError };
}
