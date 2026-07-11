import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithNuqs } from "@/lib/testNuqs";

const spies = vi.hoisted(() => ({
  pan: vi.fn(),
  zoomOnViewerCenter: vi.fn(),
  fitToViewer: vi.fn(),
}));

type MockProps = { children: ReactNode; width: number; height: number };

// Live value read by the debug-overlay poll; tests mutate this to simulate
// the user zooming/panning.
let mockViewerValue = { a: 0.5, e: 0, f: 0 };

// The runtime `UncontrolledReactSVGPanZoom` exposes no `getValue()` of its
// own (the published typedef wrongly declares one) — the live value hangs
// off its public `Viewer` field, the inner viewer instance. It also
// swallows a consumer `onChangeValue` prop rather than forwarding it, so
// `WorldMap` polls `getValue()` instead of relying on that callback.
vi.mock("react-svg-pan-zoom", async () => {
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
  vi.stubGlobal("requestAnimationFrame", (cb: RafCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
}

function flushRaf() {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  act(() => {
    callbacks.forEach((cb) => cb(0));
  });
}

beforeEach(() => {
  observers = [];
  rafCallbacks = [];
  mockViewerValue = { a: 0.5, e: 0, f: 0 };
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  stubRaf();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function stubSize(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: w });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: h });
}

// Viewer 800x600, map 7680x7680 → the map draws at 600x600, centered at
// x=100. Mocked live scale `a: 0.5` → pan step = 20% of the viewer / 0.5.
const PAN_STEP_X = (800 * 0.2) / 0.5;
const PAN_STEP_Y = (600 * 0.2) / 0.5;

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
    expect(getByText("1.00×")).not.toBeNull();
    expect(getByText("X")).not.toBeNull();
    expect(getByText("Y")).not.toBeNull();

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
});
