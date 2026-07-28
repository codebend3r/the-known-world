import { describe, it, expect } from "bun:test";
import { clamp } from "@/lib/math";

describe("clamp", () => {
  it("returns the value unchanged when within bounds", () => {
    expect(clamp({ value: 5, min: 0, max: 10 })).toBe(5);
  });

  it("clamps to the minimum when below the range", () => {
    expect(clamp({ value: -3, min: 0, max: 10 })).toBe(0);
  });

  it("clamps to the maximum when above the range", () => {
    expect(clamp({ value: 42, min: 0, max: 10 })).toBe(10);
  });

  it("returns the boundary values at the edges", () => {
    expect(clamp({ value: 0, min: 0, max: 10 })).toBe(0);
    expect(clamp({ value: 10, min: 0, max: 10 })).toBe(10);
  });

  it("handles fractional bounds", () => {
    expect(clamp({ value: 0.25, min: 0.5, max: 16 })).toBe(0.5);
    expect(clamp({ value: 20, min: 0.5, max: 16 })).toBe(16);
  });
});
