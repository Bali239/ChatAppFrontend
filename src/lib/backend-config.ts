function parseBackendUrl(value: string | undefined, variableName: string): URL {
  if (!value) {
    throw new Error(`Set ${variableName} to the public backend URL.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be an absolute HTTP or HTTPS URL.`);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(`${variableName} must be an absolute HTTP or HTTPS URL.`);
  }

  return url;
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function rejectProductionLoopback(url: URL, isProduction: boolean): void {
  if (isProduction && isLoopback(url.hostname)) {
    throw new Error("Public backend URLs cannot use localhost in production.");
  }
  if (isProduction && url.protocol !== "https:") {
    throw new Error("Public backend URLs must use HTTPS in production.");
  }
}

export function validateApiBaseUrl(
  value: string | undefined,
  isProduction = process.env.NODE_ENV === "production",
): string {
  const url = parseBackendUrl(value, "NEXT_PUBLIC_API_URL");
  const path = url.pathname.replace(/\/+$/, "");

  if (path !== "/api/v1" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_API_URL must end with /api/v1 and have no query or fragment.");
  }

  rejectProductionLoopback(url, isProduction);
  return `${url.origin}/api/v1`;
}

export function resolveSocketUrl(
  socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL,
  isProduction = process.env.NODE_ENV === "production",
): string {
  const url = parseBackendUrl(socketUrl, "NEXT_PUBLIC_SOCKET_URL");

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SOCKET_URL must be a backend origin without a path.");
  }

  rejectProductionLoopback(url, isProduction);
  return url.origin;
}
