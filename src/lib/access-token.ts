let accessToken: string | null = null;
let refreshToken: string | null = null;
const OAUTH_STATE_KEY = 'chatapp.oauth.state';
const ACCESS_TOKEN_KEY = 'chatapp.auth.access-token';
const REFRESH_TOKEN_KEY = 'chatapp.auth.refresh-token';

function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) accessToken = readStoredAccessToken();
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (!refreshToken && typeof window !== 'undefined') {
    try {
      refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return refreshToken;
}

export function setAuthTokens(nextAccessToken: string, nextRefreshToken: string): void {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
  } catch {
    // Keep tokens available for the current page if browser storage is unavailable.
  }
}

export function clearAccessToken(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing else is needed when browser storage is unavailable.
  }
}

export function createOAuthClientState(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
  return state;
}

export function consumeOAuthAccessTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return accessToken;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const incomingToken = params.get('access_token');
  const incomingRefreshToken = params.get('refresh_token');
  if (!incomingToken) return accessToken;

  const incomingState = params.get('state');
  const expectedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );

  if (
    !incomingState ||
    !expectedState ||
    incomingState !== expectedState ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(incomingToken) ||
    !incomingRefreshToken ||
    !/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/i.test(incomingRefreshToken)
  ) {
    clearAccessToken();
    return null;
  }

  setAuthTokens(incomingToken, incomingRefreshToken);
  return incomingToken;
}
