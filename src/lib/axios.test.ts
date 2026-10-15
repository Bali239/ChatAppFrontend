import { describe, expect, it } from "vitest";
import { createApiClient } from "./axios";

describe("API client", () => {
  it("uses the configured backend with credentialed requests", () => {
    const client = createApiClient("http://localhost:4000/api/v1");

    expect(client.defaults.baseURL).toBe("http://localhost:4000/api/v1");
    expect(client.defaults.withCredentials).toBe(true);
    expect(client.defaults.timeout).toBe(10_000);
  });

  it("fails a request clearly when the backend URL is missing", async () => {
    const client = createApiClient(undefined);

    await expect(client.get("/health")).rejects.toThrow("NEXT_PUBLIC_API_URL");
  });
});