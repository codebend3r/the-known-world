import { afterEach, describe, expect, it, jest } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { stubGlobal, unstubAllProperties } from "@/test/stubs";

type Listener = () => void;

function stubMatchMedia({ matches }: { matches: boolean }) {
  const state = { matches };
  const listeners = new Set<Listener>();
  const matchMedia = jest.fn((media: string) => ({
    get matches() {
      return state.matches;
    },
    media,
    addEventListener: (_type: string, listener: Listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.delete(listener);
    },
  }));
  stubGlobal({ name: "matchMedia", value: matchMedia });
  return {
    matchMedia,
    change: (next: { matches: boolean }) => {
      state.matches = next.matches;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  unstubAllProperties();
});

describe("usePrefersReducedMotion", () => {
  it("assumes reduced motion when `matchMedia` is unavailable", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("follows the media query's answer", () => {
    const { matchMedia } = stubMatchMedia({ matches: false });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("updates when the preference changes", () => {
    const media = stubMatchMedia({ matches: false });
    const { result } = renderHook(() => usePrefersReducedMotion());
    act(() => media.change({ matches: true }));
    expect(result.current).toBe(true);
  });
});
