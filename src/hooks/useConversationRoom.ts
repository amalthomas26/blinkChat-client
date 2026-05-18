import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!conversationId) return;

    const socket = socketService.getSocket();

    if (!socket) {
      setIsJoined(false);
      setIsJoinError("Socket is not connected");
      return;
    }

    let cancelled = false;

    setIsJoined(false);
    setIsJoinError(null);

    socket.emit("join_conversation", conversationId, (response) => {
      if (cancelled) return;

      if (response.success) {
        setIsJoined(true);
        setIsJoinError(null);
      } else {
        setIsJoined(false);
        setIsJoinError(response.error ?? "Failed to join conversaton");
      }
    });

    return () => {
      cancelled = true;
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId]);

  return { isJoined, joinError };
}
