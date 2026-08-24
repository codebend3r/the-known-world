import { describe, expect, it, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { setSpoilers, SPOILERS_STORAGE_KEY, useSpoilers } from "@/lib/spoilers";

describe("useSpoilers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts unspoiled when nothing is stored", () => {
    const { result } = renderHook(() => useSpoilers());
    expect(result.current.isShowingSpoilers).toBe(false);
  });

  it("reads a stored preference on mount", () => {
    window.localStorage.setItem(SPOILERS_STORAGE_KEY, "on");
    const { result } = renderHook(() => useSpoilers());
    expect(result.current.isShowingSpoilers).toBe(true);
  });

  it("treats any other stored value as off", () => {
    window.localStorage.setItem(SPOILERS_STORAGE_KEY, "yes");
    const { result } = renderHook(() => useSpoilers());
    expect(result.current.isShowingSpoilers).toBe(false);
  });

  it("toggles and persists the preference", () => {
    const { result } = renderHook(() => useSpoilers());
    act(() => result.current.toggleSpoilers());
    expect(result.current.isShowingSpoilers).toBe(true);
    expect(window.localStorage.getItem(SPOILERS_STORAGE_KEY)).toBe("on");

    act(() => result.current.toggleSpoilers());
    expect(result.current.isShowingSpoilers).toBe(false);
    expect(window.localStorage.getItem(SPOILERS_STORAGE_KEY)).toBe("off");
  });

  it("keeps every reader of the store in step", () => {
    const first = renderHook(() => useSpoilers());
    const second = renderHook(() => useSpoilers());
    act(() => setSpoilers(true));
    expect(first.result.current.isShowingSpoilers).toBe(true);
    expect(second.result.current.isShowingSpoilers).toBe(true);
  });

  it("picks up the choice made in another tab", () => {
    const { result } = renderHook(() => useSpoilers());
    act(() => {
      window.localStorage.setItem(SPOILERS_STORAGE_KEY, "on");
      window.dispatchEvent(
        new StorageEvent("storage", { key: SPOILERS_STORAGE_KEY }),
      );
    });
    expect(result.current.isShowingSpoilers).toBe(true);
  });

  it("ignores an unrelated key changing in another tab", () => {
    const { result } = renderHook(() => useSpoilers());
    act(() => {
      window.localStorage.setItem(SPOILERS_STORAGE_KEY, "on");
      window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    });
    expect(result.current.isShowingSpoilers).toBe(false);
  });
});
