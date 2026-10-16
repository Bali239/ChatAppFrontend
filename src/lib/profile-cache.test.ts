import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { updateProfileCaches } from "./profile-cache";

describe("updateProfileCaches", () => {
  it("updates cached profile surfaces for the matching user only", () => {
    const queryClient = new QueryClient();
    const profile = { id: "member-1", displayName: "New Name", avatarUrl: "https://example.com/new.png" };
    const member = { ...profile, displayName: "Old Name", avatarUrl: null, email: "member@example.com", isOnline: true };
    const unrelated = { ...member, id: "member-2", displayName: "Other Name" };

    queryClient.setQueryData(["users", "newest"], {
      pages: [{ users: [member, unrelated], nextCursor: null, hasMore: false }],
      pageParams: [null],
    });
    queryClient.setQueryData(["users", "profile", "member-1"], member);
    queryClient.setQueryData(["conversations"], {
      pages: [{ conversations: [{ id: "conversation-1", participant: member }], nextCursor: null, hasMore: false }],
      pageParams: [null],
    });
    queryClient.setQueryData(["conversations", "conversation-1", "messages"], {
      pages: [{ messages: [{ senderSnapshot: { displayName: "Old Name", avatarUrl: null } }] }],
      pageParams: [null],
    });
    queryClient.setQueryData(["auth", "current-user"], {
      id: "member-1", name: "Old Name", email: "member@example.com", avatarUrl: null,
    });

    updateProfileCaches(queryClient, profile);

    expect(queryClient.getQueryData<any>(["users", "newest"]).pages[0].users).toEqual([
      { ...member, displayName: "New Name", avatarUrl: "https://example.com/new.png" },
      unrelated,
    ]);
    expect(queryClient.getQueryData<any>(["users", "profile", "member-1"]).displayName).toBe("New Name");
    expect(queryClient.getQueryData<any>(["conversations"]).pages[0].conversations[0].participant.avatarUrl)
      .toBe("https://example.com/new.png");
    expect(queryClient.getQueryData<any>(["conversations", "conversation-1", "messages"]).pages[0].messages[0].senderSnapshot)
      .toEqual({ displayName: "Old Name", avatarUrl: null });
    expect(queryClient.getQueryData<any>(["auth", "current-user"]).name).toBe("New Name");
    queryClient.clear();
  });
});
