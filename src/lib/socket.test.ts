import { afterEach, describe, expect, it, vi } from "vitest";

const { socket, socketIo } = vi.hoisted(() => {
  const socket = {
    active: false,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  return { socket, socketIo: vi.fn(() => socket) };
});

vi.mock("socket.io-client", () => ({ io: socketIo }));

import { connectSocket, disconnectSocket } from "./socket";

describe("Socket.IO client factory", () => {
  afterEach(() => {
    disconnectSocket();
    vi.unstubAllEnvs();
    socketIo.mockClear();
    socket.connect.mockClear();
    socket.disconnect.mockClear();
    socket.active = false;
    socket.connected = false;
  });

  it("creates one credentialed, manually connected socket for the backend origin", () => {
    socket.connect.mockImplementation(() => {
      socket.active = true;
    });
    vi.stubEnv("NEXT_PUBLIC_SOCKET_URL", "http://localhost:4000");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1");

    const first = connectSocket();
    const second = connectSocket();

    expect(first).toBe(second);
    expect(socketIo).toHaveBeenCalledOnce();
    expect(socketIo).toHaveBeenCalledWith("http://localhost:4000", {
      autoConnect: false,
      auth: { token: null },
    });
    expect(socket.connect).toHaveBeenCalledOnce();
  });
});
