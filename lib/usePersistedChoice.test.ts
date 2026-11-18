import { describe, expect, it, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { usePersistedChoice } from "@/lib/usePersistedChoice";

const CHOICES = ["grid", "list"] as const;
type Choice = (typeof CHOICES)[number];

function isChoice(value: unknown): value is Choice {
  return CHOICES.some((choice) => choice === value);
}

const KEY = "test:view";

function useView() {
  return usePersistedChoice<Choice>({ key: KEY, fallback: "grid", isChoice });
}

describe("usePersistedChoice", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts on the fallback when nothing is stored", () => {
    const { result } = renderHook(() => useView());
    expect(result.current[0]).toBe("grid");
  });

  it("reads a stored choice", () => {
    window.localStorage.setItem(KEY, "list");
    const { result } = renderHook(() => useView());
    expect(result.current[0]).toBe("list");
  });

  it("ignores a stored value that is not a valid choice", () => {
    window.localStorage.setItem(KEY, "kanban");
    const { result } = renderHook(() => useView());
    expect(result.current[0]).toBe("grid");
  });

  it("updates and persists the choice", () => {
    const { result } = renderHook(() => useView());
    act(() => result.current[1]("list"));
    expect(result.current[0]).toBe("list");
    expect(window.localStorage.getItem(KEY)).toBe("list");
  });

  it("keeps every reader of the same key in step", () => {
    const first = renderHook(() => useView());
    const second = renderHook(() => useView());
    act(() => first.result.current[1]("list"));
    expect(second.result.current[0]).toBe("list");
  });

  it("picks up a choice made in another tab", () => {
    const { result } = renderHook(() => useView());
    act(() => {
      window.localStorage.setItem(KEY, "list");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current[0]).toBe("list");
  });
});
