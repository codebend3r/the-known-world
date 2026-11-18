import { describe, it, expect, jest } from "bun:test";
import {
  zoomAtPoint,
  initialCenteredTransform,
  distance,
  midpoint,
  easeOutCubic,
  canvasKeyAction,
  panStep,
  CANVAS_KEY_SHORTCUTS,
  type CanvasKeyHandlers,
} from "@/lib/pan-zoom";

describe("zoomAtPoint", () => {
  it("scales in place when the anchor is the origin of an identity transform", () => {
    expect(
      zoomAtPoint({
        current: { scale: 1, tx: 0, ty: 0 },
        scale: 2,
        anchorX: 0,
        anchorY: 0,
      }),
    ).toEqual({ scale: 2, tx: 0, ty: 0 });
  });

  it("keeps the anchor point pinned in content space while zooming", () => {
    const current = { scale: 1, tx: 0, ty: 0 };
    const anchorX = 100;
    const anchorY = 100;
    const next = zoomAtPoint({ current, scale: 2, anchorX, anchorY });
    expect(next).toEqual({ scale: 2, tx: -100, ty: -100 });

    const contentBefore = (anchorX - current.tx) / current.scale;
    const contentAfter = (anchorX - next.tx) / next.scale;
    expect(contentAfter).toBeCloseTo(contentBefore);
  });
});

describe("initialCenteredTransform", () => {
  it("leaves an identity transform when scale is 1", () => {
    expect(
      initialCenteredTransform({
        bounds: { width: 200, height: 100 },
        scale: 1,
      }),
    ).toEqual({ scale: 1, tx: 0, ty: 0 });
  });

  it("centers the viewport on the bounds midpoint when zoomed", () => {
    expect(
      initialCenteredTransform({
        bounds: { width: 200, height: 100 },
        scale: 2,
      }),
    ).toEqual({ scale: 2, tx: -100, ty: -50 });
  });
});

describe("distance", () => {
  it("returns the Euclidean distance between two points", () => {
    expect(distance({ a: { x: 0, y: 0 }, b: { x: 3, y: 4 } })).toBe(5);
  });

  it("is symmetric", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 4, y: 6 };
    expect(distance({ a, b })).toBe(distance({ a: b, b: a }));
  });

  it("returns 0 for coincident points", () => {
    expect(distance({ a: { x: 7, y: 7 }, b: { x: 7, y: 7 } })).toBe(0);
  });
});

describe("midpoint", () => {
  it("returns the average of two points", () => {
    expect(midpoint({ a: { x: 0, y: 0 }, b: { x: 10, y: 20 } })).toEqual({
      x: 5,
      y: 10,
    });
  });

  it("returns the point itself when both inputs are equal", () => {
    expect(midpoint({ a: { x: 3, y: 4 }, b: { x: 3, y: 4 } })).toEqual({
      x: 3,
      y: 4,
    });
  });
});

describe("easeOutCubic", () => {
  it("is pinned to 0 at the start", () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it("is pinned to 1 at the end", () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it("eases out past the midpoint", () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });

  it("increases monotonically", () => {
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.75));
  });
});

describe("panStep", () => {
  it("moves a fifth of the viewport, divided by the current scale", () => {
    expect(
      panStep({ direction: "up", width: 500, height: 400, scale: 2 }),
    ).toEqual({ x: 0, y: 40 });
    expect(
      panStep({ direction: "right", width: 500, height: 400, scale: 1 }),
    ).toEqual({ x: -100, y: 0 });
  });
});

describe("canvasKeyAction", () => {
  function handlers(): CanvasKeyHandlers {
    return {
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      reset: jest.fn(),
      pan: jest.fn(),
    };
  }

  it("maps + and = to zoom in, - to zoom out, and 0 to reset", () => {
    const h = handlers();
    ["+", "=", "-", "0"].forEach((key) => {
      canvasKeyAction({ key, handlers: h })?.();
    });
    expect(h.zoomIn).toHaveBeenCalledTimes(2);
    expect(h.zoomOut).toHaveBeenCalledTimes(1);
    expect(h.reset).toHaveBeenCalledTimes(1);
  });

  it("maps each arrow key to a pan in its direction", () => {
    const h = handlers();
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].forEach((key) => {
      canvasKeyAction({ key, handlers: h })?.();
    });
    expect(h.pan).toHaveBeenNthCalledWith(1, "up");
    expect(h.pan).toHaveBeenNthCalledWith(2, "down");
    expect(h.pan).toHaveBeenNthCalledWith(3, "left");
    expect(h.pan).toHaveBeenNthCalledWith(4, "right");
  });

  it("returns null for keys that are not shortcuts", () => {
    expect(canvasKeyAction({ key: "a", handlers: handlers() })).toBeNull();
    expect(
      canvasKeyAction({ key: "toString", handlers: handlers() }),
    ).toBeNull();
  });

  it("advertises every arrow plus the zoom and reset keys", () => {
    expect(CANVAS_KEY_SHORTCUTS.split(" ")).toEqual([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "+",
      "-",
      "0",
    ]);
  });
});
