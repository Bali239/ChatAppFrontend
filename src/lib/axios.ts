import axios, { type InternalAxiosRequestConfig } from "axios";

import { validateApiBaseUrl } from "./backend-config";
import {
  clearAccessToken,
  consumeOAuthAccessTokenFromLocation,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "./access-token";

type RetryableRequest = InternalAxiosRequestConfig & { authRefreshRetried?: boolean };
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(client: ReturnType<typeof axios.create>): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = client
    .post<{ data: { accessToken: string; refreshToken: string } }>("/auth/refresh", { refreshToken })
    .then((response) => {
      const tokens = response.data.data;
      setAuthTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    })
    .catch(() => {
      clearAccessToken();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function refreshSessionAccessToken(): Promise<string | null> {
  return refreshAccessToken(apiClient);
}

export function createApiClient(apiUrl = process.env.NEXT_PUBLIC_API_URL) {
  const client = axios.create({
    baseURL: apiUrl,
    timeout: 10_000,
    withCredentials: false,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((request) => {
    request.baseURL = validateApiBaseUrl(apiUrl);
    const token = consumeOAuthAccessTokenFromLocation() ?? getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    else request.headers.delete("Authorization");
    return request;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as RetryableRequest;
      const requestUrl = originalRequest.url ?? "";
      if (
        originalRequest.authRefreshRetried ||
        requestUrl.endsWith("/auth/refresh")
      ) {
        clearAccessToken();
        return Promise.reject(error);
      }

      originalRequest.authRefreshRetried = true;
      const newAccessToken = await refreshAccessToken(client);
      if (newAccessToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return client.request(originalRequest);
      }

      clearAccessToken();
      return Promise.reject(error);
    },
  );

  return client;
}

const apiClient = createApiClient();

export default apiClient;
