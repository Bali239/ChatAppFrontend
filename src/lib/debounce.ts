export const USER_SEARCH_DEBOUNCE_MS = 500;

export function scheduleDebouncedValue<T>(
  value: T,
  commit: (value: T) => void,
  delayMs = USER_SEARCH_DEBOUNCE_MS,
): () => void {
  const timer = window.setTimeout(() => commit(value), delayMs);
  return () => window.clearTimeout(timer);
}
