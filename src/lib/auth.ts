import apiClient from "./axios";
import { validateApiBaseUrl } from "./backend-config";
import { clearAccessToken, createOAuthClientState } from "./access-token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function normalizeAuthUser(user: AuthUserResponse): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function buildGoogleAuthUrl(
  returnTo?: string,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
): string {
  const baseUrl = validateApiBaseUrl(apiBaseUrl);
  const url = new URL(`${baseUrl}/auth/google`);
  const destination = returnTo ?? (typeof window !== "undefined" ? window.location.origin : undefined);

  if (destination) {
    url.searchParams.set("returnTo", destination);
  }

  return url.toString();
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    const response = await apiClient.get<{ data: { user: AuthUserResponse } }>("/auth/me", { signal });
    return normalizeAuthUser(response.data.data.user);
  } catch (error) {
    if (typeof error === "object" && error && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        return null;
      }
    }

    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
}

export function startGoogleLogin(returnTo = typeof window !== "undefined" ? window.location.href : undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(buildGoogleAuthUrl(returnTo));
  nextUrl.searchParams.set("clientState", createOAuthClientState());
  window.location.assign(nextUrl.toString());
}
