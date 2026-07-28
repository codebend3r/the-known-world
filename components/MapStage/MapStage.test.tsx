import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";

// Restoring keeps `react-svg-pan-zoom` mocked for this file only, even if the
// suite is ever run without `--isolate`.
afterAll(() => {
  mock.restore();
});

mock.module("react-svg-pan-zoom", () => ({
  ReactSVGPanZoom: ({
    children,
    width,
    height,
  }: {
    children: ReactNode;
    width: number;
    height: number;
  }) => (
    <div data-testid="pan-zoom" data-w={width} data-h={height}>
      {children}
    </div>
  ),
  TOOL_AUTO: "auto",
}));

const { MapStage } = await import("@/components/MapStage");

type ROCallback = (entries: ResizeObserverEntry[]) => void;
let observers: Array<{ cb: ROCallback; target: Element | null }> = [];

class FakeResizeObserver {
  cb: ROCallback;
  target: Element | null = null;
  constructor(cb: ROCallback) {
    this.cb = cb;
    observers.push(this);
  }
  observe(el: Element) {
    this.target = el;
  }
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
  unobserve() {}
}

beforeEach(() => {
  observers = [];
  stubGlobal({ name: "ResizeObserver", value: FakeResizeObserver });
});

afterEach(() => {
  unstubAllGlobals();
});

function stubSize(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: w });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: h });
}

describe("MapStage", () => {
  it("renders `ReactSVGPanZoom` with the measured width/height once `ResizeObserver` fires", async () => {
    const { container, findByTestId } = render(
      <MapStage svgUrl="/map.svg">
        <circle data-testid="child" />
      </MapStage>,
    );
    const stageEl = container.querySelector(".stage") as HTMLElement;
    stubSize(stageEl, 640, 1120);
    act(() => {
      observers[0].cb([]);
    });
    const pz = await findByTestId("pan-zoom");
    expect(pz.getAttribute("data-w")).toBe("640");
    expect(pz.getAttribute("data-h")).toBe("1120");
  });

  it("renders the passed `children` and the SVG `<image>` with `svgUrl`", async () => {
    const { container, findByTestId } = render(
      <MapStage svgUrl="/the-world.svg">
        <circle data-testid="child" />
      </MapStage>,
    );
    const stageEl = container.querySelector(".stage") as HTMLElement;
    stubSize(stageEl, 800, 1400);
    act(() => {
      observers[0].cb([]);
    });
    await findByTestId("pan-zoom");
    const img = container.querySelector("image");
    expect(img?.getAttribute("href")).toBe("/the-world.svg");
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it("uses an 800x1400 fixed viewport for the inner svg", async () => {
    const { container, findByTestId } = render(
      <MapStage svgUrl="/m.svg">
        <g />
      </MapStage>,
    );
    const stageEl = container.querySelector(".stage") as HTMLElement;
    stubSize(stageEl, 100, 100);
    act(() => {
      observers[0].cb([]);
    });
    await findByTestId("pan-zoom");
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("800");
    expect(svg?.getAttribute("height")).toBe("1400");
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(
      <MapStage svgUrl="/m.svg">
        <g />
      </MapStage>,
    );
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers).toHaveLength(0);
  });
});
