import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("The socket client can only be started in a browser.");
  }

  const url =
    process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!url) {
    throw new Error(
      "Set NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_API_URL before connecting.",
    );
  }

  if (!socket) {
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
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