import type { ReactElement } from "react";
import { act, render, type RenderOptions } from "@testing-library/react";
import { jest, type Mock } from "bun:test";
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
  const onUrlUpdate: UrlUpdateSpy = jest.fn();
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

// nuqs commits URL writes on a timer, so a synchronous `act` never reaches it.
// Awaiting this lets the write land inside `act`, so the `onUrlUpdate` spy has
// fired before assertions run.
export async function flushNuqs(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Promise.resolve();
  });
}

// Waits real time inside `act`, for debounces and mount effects.
//
// These tests used to step a faked clock, but Bun's fake timers do not drive
// nuqs's flush queue: once a handful of tests in a file have run, the timer
// nuqs schedules to commit a URL write stops firing under
// `advanceTimersByTime`, so every `onUrlUpdate` assertion sees nothing. Real
// timers keep the same assertions honest, at the cost of the wait.
export async function advanceTime({ ms }: { ms: number }): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
  // A debounce that fired above queues a nuqs URL write that React commits on
  // the next tick — after the `act` above has already exited. A second round
  // takes that commit inside `act`, so React doesn't report an update outside
  // it. This adds no wait, so it cannot push `ms` past a debounce boundary.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
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
