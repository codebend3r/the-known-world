import { describe, it, expect } from "vitest";
import {
  zoomAtPoint,
  initialCenteredTransform,
  distance,
  midpoint,
  easeOutCubic,
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
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("is symmetric", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 4, y: 6 };
    expect(distance(a, b)).toBe(distance(b, a));
  });

  it("returns 0 for coincident points", () => {
    expect(distance({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe(0);
  });
});

describe("midpoint", () => {
  it("returns the average of two points", () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it("returns the point itself when both inputs are equal", () => {
    expect(midpoint({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
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
