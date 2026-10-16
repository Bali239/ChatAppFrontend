import axios from "axios";

import { validateApiBaseUrl } from "./backend-config";
import { clearAccessToken, consumeOAuthAccessTokenFromLocation, getAccessToken } from "./access-token";

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
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) clearAccessToken();
      return Promise.reject(error);
    },
  );

  return client;
}

const apiClient = createApiClient();

export default apiClient;
