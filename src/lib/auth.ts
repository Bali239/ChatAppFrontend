import apiClient from "./axios";

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

function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value) {
    return "http://localhost:4000/api/v1";
  }

  return value.replace(/\/+$/, "");
}

export function normalizeAuthUser(user: AuthUserResponse): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function buildGoogleAuthUrl(
  returnTo = typeof window !== "undefined" ? window.location.origin : "https://localhost:3000",
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
): string {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const url = new URL(`${baseUrl}/auth/google`);

  if (returnTo) {
    url.searchParams.set("returnTo", returnTo);
  }

  return url.toString();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiClient.get<{ data: { user: AuthUserResponse } }>("/auth/me");
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

export async function getCsrfToken(): Promise<string> {
  const response = await apiClient.get<{ data: { csrfToken: string } }>("/auth/csrf");
  return response.data.data.csrfToken;
}

export async function logoutUser(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await apiClient.post("/auth/logout", undefined, {
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function startGoogleLogin(returnTo = typeof window !== "undefined" ? window.location.href : undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = buildGoogleAuthUrl(returnTo);
  window.location.assign(nextUrl);
}
