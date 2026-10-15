import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSocketUrl, validateApiBaseUrl } from "./backend-config";

describe("public backend URL configuration", () => {
  it("requires the versioned API path and normalizes a trailing slash", () => {
    expect(validateApiBaseUrl("http://localhost:4000/api/v1/")).toBe(
      "http://localhost:4000/api/v1",
    );
    expect(() => validateApiBaseUrl("http://localhost:4000/api")).toThrow(
      "/api/v1",
    );
    expect(() => validateApiBaseUrl(undefined)).toThrow("NEXT_PUBLIC_API_URL");
  });

  it("rejects local backend URLs in production", () => {
    expect(() =>
      validateApiBaseUrl("http://localhost:4000/api/v1", true),
    ).toThrow("localhost");
    expect(() => resolveSocketUrl("http://127.0.0.1:4000", undefined, true)).toThrow(
      "localhost",
    );
    expect(() => validateApiBaseUrl("http://api.example.com/api/v1", true)).toThrow(
      "Public backend URLs must use HTTPS in production."
    );
    expect(() => resolveSocketUrl("http://socket.example.com", undefined, true)).toThrow(
      "Public backend URLs must use HTTPS in production."
    );
  });

  it("uses the API origin for Socket.IO only when no socket origin is configured", () => {
    expect(resolveSocketUrl(undefined, "https://api.example.com/api/v1", true)).toBe(
      "https://api.example.com",
    );
    expect(resolveSocketUrl("https://socket.example.com", undefined, true)).toBe(
      "https://socket.example.com",
    );
    expect(() => resolveSocketUrl("https://socket.example.com/socket.io")).toThrow(
      "without a path",
    );
  });

  it("keeps the checked-in local example aligned with the backend API and socket origin", () => {
    const entries = Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.example"), "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split("=")),
    );

    const apiUrl = validateApiBaseUrl(entries.NEXT_PUBLIC_API_URL);

    expect(new URL(apiUrl).pathname).toBe("/api/v1");
    expect(resolveSocketUrl(entries.NEXT_PUBLIC_SOCKET_URL)).toBe(
      new URL(apiUrl).origin,
    );
  });
});