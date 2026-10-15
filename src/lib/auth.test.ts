import { describe, expect, it } from "vitest";

import { buildGoogleAuthUrl, normalizeAuthUser } from "./auth";

describe("auth helpers", () => {
  it("builds a Google auth redirect URL with a safe returnTo path", () => {
    const url = buildGoogleAuthUrl(
      "https://chat.example.com/dashboard",
      "https://api.example.com/api/v1",
    );

    expect(url).toBe(
      "https://api.example.com/api/v1/auth/google?returnTo=https%3A%2F%2Fchat.example.com%2Fdashboard",
    );
  });

  it("normalizes the current-user payload from the API", () => {
    const user = normalizeAuthUser({
      id: "user-123",
      name: "Jane Doe",
      email: "jane@example.com",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(user).toEqual({
      id: "user-123",
      name: "Jane Doe",
      email: "jane@example.com",
      avatarUrl: "https://example.com/avatar.png",
    });
  });
});
