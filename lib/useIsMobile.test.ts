import { afterEach, describe, expect, it, jest } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "@/lib/useIsMobile";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";

type Listener = () => void;

// A media query list whose answer the test can flip, firing `change` to
// every subscriber the way a browser does when the viewport crosses `bp.$sm`.
function stubMatchMedia({ matches }: { matches: boolean }) {
  const state = { matches };
  const listeners = new Set<Listener>();
  const addEventListener = jest.fn((_type: string, listener: Listener) => {
    listeners.add(listener);
  });
  const removeEventListener = jest.fn((_type: string, listener: Listener) => {
    listeners.delete(listener);
  });
  const matchMedia = jest.fn((media: string) => ({
    get matches() {
      return state.matches;
    },
    media,
    addEventListener,
    removeEventListener,
  }));
  stubGlobal({ name: "matchMedia", value: matchMedia });
  return {
    matchMedia,
    addEventListener,
    removeEventListener,
    change: (next: { matches: boolean }) => {
      state.matches = next.matches;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("reports desktop when `matchMedia` is unavailable", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reports mobile when the viewport matches the small breakpoint", () => {
    const { matchMedia } = stubMatchMedia({ matches: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 639.98px)");
  });

  it("reports desktop when the viewport is wider than the small breakpoint", () => {
    stubMatchMedia({ matches: false });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("follows the viewport across the breakpoint", () => {
    const media = stubMatchMedia({ matches: false });
    const { result } = renderHook(() => useIsMobile());

    act(() => media.change({ matches: true }));
    expect(result.current).toBe(true);

    act(() => media.change({ matches: false }));
    expect(result.current).toBe(false);
  });

  it("stops listening once unmounted", () => {
    const media = stubMatchMedia({ matches: false });
    const { unmount } = renderHook(() => useIsMobile());
    const [[, subscribed]] = media.addEventListener.mock.calls;

    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      subscribed,
    );
  });
});
