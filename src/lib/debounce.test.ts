import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleDebouncedValue, USER_SEARCH_DEBOUNCE_MS } from "./debounce";

afterEach(() => vi.useRealTimers());

describe("search debounce", () => {
  it("commits only after exactly 500 ms", () => {
    vi.useFakeTimers();
    const commit = vi.fn();

    scheduleDebouncedValue("jane", commit);
    expect(USER_SEARCH_DEBOUNCE_MS).toBe(500);
    vi.advanceTimersByTime(499);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith("jane");
  });

  it("cancels an obsolete value when the query changes", () => {
    vi.useFakeTimers();
    const commit = vi.fn();

    const cancelPrevious = scheduleDebouncedValue("ja", commit);
    cancelPrevious();
    scheduleDebouncedValue("jane", commit);
    vi.advanceTimersByTime(500);

    expect(commit).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith("jane");
  });
});