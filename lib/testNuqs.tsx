import type { ReactElement } from "react";
import { act, render, type RenderOptions } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import {
  withNuqsTestingAdapter,
  type UrlUpdateEvent,
} from "nuqs/adapters/testing";

export type UrlUpdateSpy = Mock<(event: UrlUpdateEvent) => void>;

type Options = Omit<RenderOptions, "wrapper"> & {
  searchParams?: string | Record<string, string>;
};

// Wraps a render in nuqs's testing adapter so `useQueryState`/`useQueryStates`
// have an adapter in context. `hasMemory` makes writes persist (so a write then
// read round-trips like the real adapter), and the returned `onUrlUpdate` spy
// captures every URL write for assertion.
export function renderWithNuqs(ui: ReactElement, options: Options = {}) {
  const { searchParams, ...renderOptions } = options;
  const onUrlUpdate: UrlUpdateSpy = vi.fn();
  const result = render(ui, {
    ...renderOptions,
    wrapper: withNuqsTestingAdapter({
      searchParams,
      onUrlUpdate,
      hasMemory: true,
    }),
  });
  return { ...result, onUrlUpdate };
}

// nuqs commits URL writes on a throttled timer, so a synchronous `act` never
// reaches it. Awaiting this advances timers (or waits, under real timers) and
// drains the microtask queue inside `act`, so the `onUrlUpdate` spy has fired
// before assertions run.
export async function flushNuqs(): Promise<void> {
  await act(async () => {
    if (vi.isFakeTimers()) {
      vi.advanceTimersByTime(100);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await Promise.resolve();
  });
}

export function lastUrlUpdate(spy: UrlUpdateSpy): UrlUpdateEvent | null {
  return spy.mock.calls.at(-1)?.[0] ?? null;
}

export function lastQueryString(spy: UrlUpdateSpy): string {
  return lastUrlUpdate(spy)?.queryString ?? "";
}

export function lastSearchParams(spy: UrlUpdateSpy): URLSearchParams {
  return lastUrlUpdate(spy)?.searchParams ?? new URLSearchParams();
}
