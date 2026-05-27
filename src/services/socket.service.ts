import { io, Socket } from "socket.io-client";
import { env } from "../config/env";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket.types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let currentToken: string | null = null;

// ── MAJ-6: Refresh the socket's auth token on connect_error ──
// When the access token expires and Socket.IO tries to reconnect,
// the server rejects the stale token. This handler silently fetches
// a fresh access token via the httpOnly refresh cookie, updates
// socket.auth, and lets the built-in reconnection retry.
let isRefreshingSocketToken = false;

async function handleSocketAuthError(s: AppSocket): Promise<void> {
  if (isRefreshingSocketToken) return;
  isRefreshingSocketToken = true;

  try {
    const res = await fetch(`${env.API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      // Refresh cookie is invalid — nothing we can do
      return;
    }

    const body = await res.json();
    const newToken: string | undefined = body?.data?.accessToken;
    if (!newToken) return;

    // Update the in-memory token
    const { useAuthStore } = await import("../store/auth.store");
    useAuthStore.getState().setAccessToken(newToken);

    // Update socket auth so the next reconnection attempt uses the new token
    currentToken = newToken;
    if (s.auth && typeof s.auth === "object") {
      (s.auth as Record<string, string>).token = newToken;
    }
    // Socket.IO will automatically retry the connection
  } catch {
    // Network error — Socket.IO's built-in reconnect backoff will handle it
  } finally {
    isRefreshingSocketToken = false;
  }
}

function connect(accessToken: string): AppSocket {
  if (socket && currentToken === accessToken) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = accessToken;

  socket = io(env.SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // MAJ-6: Intercept auth errors during (re)connection
  socket.on("connect_error", (err) => {
    const isAuthError =
      err.message === "AUTH_NO_TOKEN" ||
      err.message === "AUTH_INVALID_TOKEN" ||
      err.message === "AUTH_INVALID_PAYLOAD";

    if (isAuthError && socket) {
      void handleSocketAuthError(socket);
    }
  });

  return socket;
}

function disconnect(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
}

function getSocket(): AppSocket | null {
  return socket;
}

function onReconnect(callback: () => void): () => void {
  if (!socket) return () => {};

  socket.on("connect", callback);
  return () => {
    socket?.off("connect", callback);
  };
}

function isConnected(): boolean {
  return socket?.connected ?? false;
}
export const socketService = {
  connect,
  disconnect,
  getSocket,
  onReconnect,
  isConnected,
};
