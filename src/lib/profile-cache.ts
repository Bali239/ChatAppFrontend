import type { QueryClient } from "@tanstack/react-query";
import type { AuthUser } from "./auth";
import type { ProfileUpdatedEvent } from "./chat-api";

function updateProfileData(value: unknown, profile: ProfileUpdatedEvent): unknown {
  if (!value || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => updateProfileData(item, profile));
  }

  const record = value as Record<string, unknown>;
  let changed = false;
  const result: Record<string, unknown> = { ...record };

  if (Array.isArray(record.users)) {
    result.users = record.users.map((item) => updateProfileData(item, profile));
    changed = true;
  }
  if (Array.isArray(record.conversations)) {
    result.conversations = record.conversations.map((item) => updateProfileData(item, profile));
    changed = true;
  }
  if (Array.isArray(record.pages)) {
    result.pages = record.pages.map((item) => updateProfileData(item, profile));
    changed = true;
  }
  if (record.participant && typeof record.participant === "object") {
    result.participant = updateProfileData(record.participant, profile);
    changed = true;
  }

  if (record.id === profile.id && typeof record.displayName === "string") {
    result.displayName = profile.displayName;
    result.avatarUrl = profile.avatarUrl;
    changed = true;
  }
  if (record.id === profile.id && typeof record.name === "string") {
    result.name = profile.displayName;
    result.avatarUrl = profile.avatarUrl;
    changed = true;
  }

  return changed ? result : value;
}

export function updateProfileCaches(queryClient: QueryClient, profile: ProfileUpdatedEvent): void {
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ["users"] })) {
    queryClient.setQueryData(queryKey, updateProfileData(data, profile));
  }
  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: ["conversations"] })) {
    queryClient.setQueryData(queryKey, updateProfileData(data, profile));
  }
  queryClient.setQueryData<AuthUser | undefined>(["auth", "current-user"], (current) =>
    current?.id === profile.id
      ? { ...current, name: profile.displayName, avatarUrl: profile.avatarUrl }
      : current,
  );
}
