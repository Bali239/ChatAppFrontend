let accessToken: string | null = null;
const OAUTH_STATE_KEY = 'chatapp.oauth.state';

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
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
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(incomingToken)
  ) {
    accessToken = null;
    return null;
  }

  accessToken = incomingToken;
  return accessToken;
}
