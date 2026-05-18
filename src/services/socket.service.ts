import { io, Socket } from "socket.io-client";
import { env } from "../config/env";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket.types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let currentToken: string | null = null;

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
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
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
