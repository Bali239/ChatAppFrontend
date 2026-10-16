import { io, type Socket } from "socket.io-client";
import { resolveSocketUrl } from "./backend-config";
import { getAccessToken } from "./access-token";
import { refreshSessionAccessToken } from "./axios";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("The socket client can only be started in a browser.");
  }

  const url = resolveSocketUrl();

  if (!socket) {
    socket = io(url, {
      autoConnect: false,
      auth: { token: getAccessToken() },
    });
    let refreshing = false;
    socket.on("connect_error", async (error) => {
      if (error.message !== "Authentication required" || refreshing || !socket) return;
      refreshing = true;
      const token = await refreshSessionAccessToken();
      refreshing = false;
      if (!socket) return;
      if (!token) {
        socket.disconnect();
        return;
      }
      socket.auth = { token };
      socket.connect();
    });
  }

  if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
