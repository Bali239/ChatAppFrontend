import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAvatarImage, type AvatarUploadSignature } from "./chat-api";

const signature: AvatarUploadSignature = {
  cloudName: "test-cloud",
  apiKey: "test-key",
  signature: "signed-value",
  timestamp: 1_797_000_000,
  folder: "chatapp/avatars/test-owner",
  publicId: "avatar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  uploadPreset: "avatar-preset",
  allowedFormats: ["jpg", "png", "webp"],
  maxBytes: 5 * 1024 * 1024,
  uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
};

afterEach(() => vi.unstubAllGlobals());

describe("avatar upload client", () => {
  it("maps the browser JPEG MIME type to the signed JPG format", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ public_id: signature.publicId }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image"], "avatar.jpg", { type: "image/jpeg" });

    await expect(uploadAvatarImage(file, signature)).resolves.toBe(signature.publicId);

    const formData = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(formData.get("allowed_formats")).toBe("jpg,png,webp");
    expect(formData.get("upload_preset")).toBe("avatar-preset");
  });

  it("rejects unsupported files before sending them to Cloudinary", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["text"], "avatar.txt", { type: "text/plain" });

    await expect(uploadAvatarImage(file, signature)).rejects.toThrow(/JPG, PNG, or WebP/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
