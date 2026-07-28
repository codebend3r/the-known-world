import {
  describe,
  it,
  expect,
  jest,
  mock,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";
import { act, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithNuqs } from "@/lib/testNuqs";

// `mock.module` is not hoisted in Bun, so plain consts suffice where Vitest
// needed `vi.hoisted` to lift the spies above the hoisted factory.
const spies = {
  pan: jest.fn(),
  zoomOnViewerCenter: jest.fn(),
  fitToViewer: jest.fn(),
  setValue: jest.fn(),
};

// Restoring keeps `react-svg-pan-zoom` mocked for this file only, even if the
// suite is ever run without `--isolate`.
afterAll(() => {
  mock.restore();
});

type MockProps = { children: ReactNode; width: number; height: number };
type MockValue = { a: number; e: number; f: number };

// Live value read by the debug-overlay poll; tests mutate this to simulate
// the user zooming/panning. `WorldMap` overwrites it on mount via
// `Viewer.setValue()` to seed its initial view.
let mockViewerValue: MockValue = { a: 0.5, e: 0, f: 0 };

// The runtime `UncontrolledReactSVGPanZoom` exposes no `getValue()`/`setValue()`
// of its own (the published typedef wrongly declares them) — the live value
// hangs off its public `Viewer` field, the inner viewer instance. It also
// swallows a consumer `onChangeValue` prop rather than forwarding it, so
// `WorldMap` polls `getValue()` instead of relying on that callback.
mock.module("react-svg-pan-zoom", async () => {
  const { Component } = await import("react");
  class UncontrolledReactSVGPanZoom extends Component<MockProps> {
    pan = spies.pan;
    zoomOnViewerCenter = spies.zoomOnViewerCenter;
    fitToViewer = spies.fitToViewer;
    Viewer = {
      getValue: () => ({
        ...mockViewerValue,
        viewerWidth: this.props.width,
        viewerHeight: this.props.height,
      }),
      setValue: (value: MockValue) => {
        spies.setValue(value);
        mockViewerValue = { a: value.a, e: value.e, f: value.f };
      },
    };
    render() {
      return (
        <div
          data-testid="pan-zoom"
          data-w={this.props.width}
          data-h={this.props.height}
        >
          {this.props.children}
        </div>
      );
    }
  }
  return { UncontrolledReactSVGPanZoom, TOOL_AUTO: "auto" };
});

const { WorldMap } = await import("@/components/WorldMap");

type ROCallback = () => void;
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

type RafCallback = (time: number) => void;
let rafCallbacks: RafCallback[] = [];

// Captures scheduled frames instead of running them, so tests advance the
// debug-overlay poll deterministically via `flushRaf()`.
function stubRaf() {
  stubGlobal({
    name: "requestAnimationFrame",
    value: (cb: RafCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    },
  });
  stubGlobal({ name: "cancelAnimationFrame", value: () => {} });
}

function flushRaf() {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  act(() => {
    callbacks.forEach((cb) => cb(0));
  });
}

// happy-dom implements none of the Fullscreen API; `requestFullscreen()` /
// `exitFullscreen()` are faked to track the current element and dispatch
// `fullscreenchange`, matching real browser behavior closely enough to
// drive `WorldMap`'s toggle state.
let fullscreenElement: Element | null = null;
Object.defineProperty(document, "fullscreenElement", {
  configurable: true,
  get: () => fullscreenElement,
});
function markFullscreenElement(el: Element | null) {
  fullscreenElement = el;
}
HTMLElement.prototype.requestFullscreen = jest.fn(function (this: HTMLElement) {
  markFullscreenElement(this);
  document.dispatchEvent(new Event("fullscreenchange"));
  return Promise.resolve();
});
document.exitFullscreen = jest.fn(() => {
  fullscreenElement = null;
  document.dispatchEvent(new Event("fullscreenchange"));
  return Promise.resolve();
});

beforeEach(() => {
  observers = [];
  rafCallbacks = [];
  mockViewerValue = { a: 0.5, e: 0, f: 0 };
  fullscreenElement = null;
  stubGlobal({ name: "ResizeObserver", value: FakeResizeObserver });
  stubRaf();
});

afterEach(() => {
  unstubAllGlobals();
  jest.clearAllMocks();
});

function stubSize(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: w });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: h });
}

// Viewer 800x600, map 7680x7680 → the map draws at 600x600, centered at
// x=100. `WorldMap` seeds the view to zoom 5 on mount, so pan step = 20%
// of the viewer / 5.
const SEEDED_VIEW = { zoom: 5, x: -1495, y: -1940 };
const PAN_STEP_X = (800 * 0.2) / SEEDED_VIEW.zoom;
const PAN_STEP_Y = (600 * 0.2) / SEEDED_VIEW.zoom;
const NATURAL_SIZE = 7680;
const KINGS_LANDING = { x: 1955, y: 4619, radius: 25 };

function fitScaleFor(size: { w: number; h: number }) {
  return Math.min(size.w / NATURAL_SIZE, size.h / NATURAL_SIZE);
}

// Inverts a pan/zoom transform back to the natural-map point currently
// centered on screen, given the viewer size and fit scale it applies to.
function centeredNaturalPoint(
  value: { a: number; e: number; f: number },
  size: { w: number; h: number },
  fitScale: number,
) {
  const drawnSize = NATURAL_SIZE * fitScale;
  const offsetX = (size.w - drawnSize) / 2;
  const offsetY = (size.h - drawnSize) / 2;
  const svgX = (size.w / 2 - value.e) / value.a;
  const svgY = (size.h / 2 - value.f) / value.a;
  return { x: (svgX - offsetX) / fitScale, y: (svgY - offsetY) / fitScale };
}

function renderMap(searchParams?: string) {
  const utils = renderWithNuqs(
    <WorldMap
      src="/map/test-map.jpg"
      naturalWidth={7680}
      naturalHeight={7680}
    />,
    { searchParams },
  );
  const stage = utils.getByRole("application");
  stubSize(stage, 800, 600);
  act(() => {
    observers[0].cb();
  });
  return { ...utils, stage };
}

describe("WorldMap", () => {
  it("renders the viewer with the measured width/height once `ResizeObserver` fires", async () => {
    const { findByTestId } = renderMap();
    const viewer = await findByTestId("pan-zoom");
    expect(viewer.getAttribute("data-w")).toBe("800");
    expect(viewer.getAttribute("data-h")).toBe("600");
  });

  it("draws the map centered at fit size inside a viewer-sized SVG", async () => {
    const { container, findByTestId } = renderMap();
    await findByTestId("pan-zoom");
    const svg = container.querySelector("svg[width='800']");
    expect(svg?.getAttribute("height")).toBe("600");
    const image = container.querySelector("image");
    expect(image?.getAttribute("href")).toBe("/map/test-map.jpg");
    expect(image?.getAttribute("x")).toBe("100");
    expect(image?.getAttribute("y")).toBe("0");
    expect(image?.getAttribute("width")).toBe("600");
    expect(image?.getAttribute("height")).toBe("600");
  });

  it("zooms in and out from the buttons", async () => {
    const { findByTestId, getByRole } = renderMap();
    await findByTestId("pan-zoom");
    fireEvent.click(getByRole("button", { name: "Zoom in" }));
    expect(spies.zoomOnViewerCenter).toHaveBeenCalledWith(1.5);
    fireEvent.click(getByRole("button", { name: "Zoom out" }));
    expect(spies.zoomOnViewerCenter).toHaveBeenCalledWith(1 / 1.5);
  });

  it("pans a fifth of the viewer per d-pad press, scaled to the current zoom", async () => {
    const { findByTestId, getByRole } = renderMap();
    await findByTestId("pan-zoom");
    fireEvent.click(getByRole("button", { name: "Pan up" }));
    expect(spies.pan).toHaveBeenLastCalledWith(0, PAN_STEP_Y);
    fireEvent.click(getByRole("button", { name: "Pan down" }));
    expect(spies.pan).toHaveBeenLastCalledWith(0, -PAN_STEP_Y);
    fireEvent.click(getByRole("button", { name: "Pan left" }));
    expect(spies.pan).toHaveBeenLastCalledWith(PAN_STEP_X, 0);
    fireEvent.click(getByRole("button", { name: "Pan right" }));
    expect(spies.pan).toHaveBeenLastCalledWith(-PAN_STEP_X, 0);
  });

  it("resets to the fitted view from the reset button", async () => {
    const { findByTestId, getByRole } = renderMap();
    await findByTestId("pan-zoom");
    fireEvent.click(getByRole("button", { name: "Reset view" }));
    expect(spies.fitToViewer).toHaveBeenCalledTimes(1);
  });

  it("supports `+`/`=`/`-` zoom and `0` reset keyboard shortcuts", async () => {
    const { findByTestId, stage } = renderMap();
    await findByTestId("pan-zoom");
    fireEvent.keyDown(stage, { key: "+" });
    expect(spies.zoomOnViewerCenter).toHaveBeenLastCalledWith(1.5);
    fireEvent.keyDown(stage, { key: "=" });
    expect(spies.zoomOnViewerCenter).toHaveBeenLastCalledWith(1.5);
    fireEvent.keyDown(stage, { key: "-" });
    expect(spies.zoomOnViewerCenter).toHaveBeenLastCalledWith(1 / 1.5);
    fireEvent.keyDown(stage, { key: "0" });
    expect(spies.fitToViewer).toHaveBeenCalledTimes(1);
  });

  it("pans with the arrow keys and prevents page scroll", async () => {
    const { findByTestId, stage } = renderMap();
    await findByTestId("pan-zoom");
    expect(fireEvent.keyDown(stage, { key: "ArrowUp" })).toBe(false);
    expect(spies.pan).toHaveBeenLastCalledWith(0, PAN_STEP_Y);
    expect(fireEvent.keyDown(stage, { key: "ArrowDown" })).toBe(false);
    expect(spies.pan).toHaveBeenLastCalledWith(0, -PAN_STEP_Y);
    expect(fireEvent.keyDown(stage, { key: "ArrowLeft" })).toBe(false);
    expect(spies.pan).toHaveBeenLastCalledWith(PAN_STEP_X, 0);
    expect(fireEvent.keyDown(stage, { key: "ArrowRight" })).toBe(false);
    expect(spies.pan).toHaveBeenLastCalledWith(-PAN_STEP_X, 0);
  });

  it("ignores unhandled keys", async () => {
    const { findByTestId, stage } = renderMap();
    await findByTestId("pan-zoom");
    expect(fireEvent.keyDown(stage, { key: "a" })).toBe(true);
    expect(spies.pan).not.toHaveBeenCalled();
    expect(spies.zoomOnViewerCenter).not.toHaveBeenCalled();
  });

  it("exposes a focusable, labelled stage and labelled control groups", async () => {
    const { findByTestId, stage, getByRole } = renderMap();
    await findByTestId("pan-zoom");
    expect(stage.getAttribute("tabindex")).toBe("0");
    expect(stage.getAttribute("aria-label")).toBe(
      "Interactive map of the Known World",
    );
    expect(getByRole("group", { name: "Pan controls" })).not.toBeNull();
    expect(getByRole("group", { name: "Zoom controls" })).not.toBeNull();
  });

  it("lists the gestures and shortcuts in the caption", async () => {
    const { findByTestId, getByText } = renderMap();
    await findByTestId("pan-zoom");
    expect(getByText(/scroll or pinch to zoom/i)).not.toBeNull();
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = renderWithNuqs(
      <WorldMap
        src="/map/test-map.jpg"
        naturalWidth={7680}
        naturalHeight={7680}
      />,
    );
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers).toHaveLength(0);
  });

  it("hides the debug overlay by default", async () => {
    const { findByTestId, queryByText } = renderMap();
    await findByTestId("pan-zoom");
    expect(queryByText("Zoom")).toBeNull();
  });

  it("shows zoom/x/y debug info when `editMode=true`", async () => {
    const { findByTestId, getByText } = renderMap("editMode=true");
    await findByTestId("pan-zoom");
    expect(getByText("Zoom")).not.toBeNull();
    expect(getByText("5.00×")).not.toBeNull();
    expect(getByText("X")).not.toBeNull();
    expect(getByText("-1495")).not.toBeNull();
    expect(getByText("Y")).not.toBeNull();
    expect(getByText("-1940")).not.toBeNull();

    mockViewerValue = { a: 2.5, e: -120, f: 40 };
    flushRaf();
    expect(getByText("2.50×")).not.toBeNull();
    expect(getByText("-120")).not.toBeNull();
    expect(getByText("40")).not.toBeNull();
  });

  it("does not poll for debug values when `editMode` is off", async () => {
    const { findByTestId } = renderMap();
    await findByTestId("pan-zoom");
    expect(rafCallbacks).toHaveLength(0);
  });

  it("seeds the initial pan/zoom view on mount", async () => {
    const { findByTestId } = renderMap();
    await findByTestId("pan-zoom");
    expect(spies.setValue).toHaveBeenCalledTimes(1);
    expect(spies.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        a: SEEDED_VIEW.zoom,
        d: SEEDED_VIEW.zoom,
        e: SEEDED_VIEW.x,
        f: SEEDED_VIEW.y,
      }),
    );
  });

  it("keeps the same map point centered, at the same effective zoom, across a resize", async () => {
    const { findByTestId, stage } = renderMap();
    await findByTestId("pan-zoom");
    expect(spies.setValue).toHaveBeenCalledTimes(1);

    const size1 = { w: 800, h: 600 };
    const fitScale1 = fitScaleFor(size1);
    const seeded = spies.setValue.mock.calls[0][0];
    const naturalBefore = centeredNaturalPoint(seeded, size1, fitScale1);
    const effectiveZoomBefore = seeded.a * fitScale1;

    const size2 = { w: 900, h: 700 };
    stubSize(stage, size2.w, size2.h);
    act(() => {
      observers[0].cb();
    });

    expect(spies.setValue).toHaveBeenCalledTimes(2);
    const resized = spies.setValue.mock.calls[1][0];
    const fitScale2 = fitScaleFor(size2);
    const naturalAfter = centeredNaturalPoint(resized, size2, fitScale2);
    const effectiveZoomAfter = resized.a * fitScale2;

    expect(naturalAfter.x).toBeCloseTo(naturalBefore.x, 6);
    expect(naturalAfter.y).toBeCloseTo(naturalBefore.y, 6);
    expect(effectiveZoomAfter).toBeCloseTo(effectiveZoomBefore, 6);
  });

  it("does not adjust the transform when a resize reports the same size", async () => {
    const { findByTestId, stage } = renderMap();
    await findByTestId("pan-zoom");
    expect(spies.setValue).toHaveBeenCalledTimes(1);

    stubSize(stage, 800, 600);
    act(() => {
      observers[0].cb();
    });
    expect(spies.setValue).toHaveBeenCalledTimes(1);
  });

  it("marks King's Landing with a link to its page, positioned by natural coordinates", async () => {
    const { findByTestId, getByRole } = renderMap();
    await findByTestId("pan-zoom");

    const link = getByRole("link", { name: "King's Landing" });
    expect(link.getAttribute("href")).toBe("/castles/kings-landing/");

    const circle = link.querySelector("circle");
    const size = { w: 800, h: 600 };
    const fitScale = fitScaleFor(size);
    const offsetX = (size.w - NATURAL_SIZE * fitScale) / 2;
    const offsetY = (size.h - NATURAL_SIZE * fitScale) / 2;
    expect(Number(circle?.getAttribute("cx"))).toBeCloseTo(
      offsetX + KINGS_LANDING.x * fitScale,
      6,
    );
    expect(Number(circle?.getAttribute("cy"))).toBeCloseTo(
      offsetY + KINGS_LANDING.y * fitScale,
      6,
    );
    expect(Number(circle?.getAttribute("r"))).toBeCloseTo(
      KINGS_LANDING.radius * fitScale,
      6,
    );
  });

  it("requests fullscreen on the stage and flips to Exit fullscreen", async () => {
    const { findByTestId, getByRole, stage } = renderMap();
    await findByTestId("pan-zoom");

    fireEvent.click(getByRole("button", { name: "Enter fullscreen" }));
    expect(stage.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(getByRole("button", { name: "Exit fullscreen" })).not.toBeNull();
  });

  it("exits fullscreen from the same button once entered", async () => {
    const { findByTestId, getByRole } = renderMap();
    await findByTestId("pan-zoom");

    fireEvent.click(getByRole("button", { name: "Enter fullscreen" }));
    fireEvent.click(getByRole("button", { name: "Exit fullscreen" }));
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(getByRole("button", { name: "Enter fullscreen" })).not.toBeNull();
  });
});
