import axios from "axios";

import { validateApiBaseUrl } from "./backend-config";

export function createApiClient(apiUrl = process.env.NEXT_PUBLIC_API_URL) {
  const client = axios.create({
    baseURL: apiUrl,
    timeout: 10_000,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((request) => {
    request.baseURL = validateApiBaseUrl(apiUrl);
    return request;
  });

  return client;
}

const apiClient = createApiClient();

export default apiClient;
