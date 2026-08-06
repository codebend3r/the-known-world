import { describe, it, expect, mock, afterAll } from "bun:test";

// `next/font/google` is a build-time loader that only resolves inside the Next
// bundler. The layout only uses the `variable` it returns, so a stub is enough
// to get the module's `viewport` export under test.
mock.module("next/font/google", () => {
  const font = () => ({ variable: "font-variable", className: "font" });
  return {
    Cormorant_Garamond: font,
    JetBrains_Mono: font,
    Spectral: font,
  };
});

afterAll(() => {
  mock.restore();
});

const { viewport } = await import("@/app/layout");

describe("root layout viewport", () => {
  // WCAG 1.4.4 (Resize Text) requires 200% zoom. `maximumScale` and
  // `userScalable: false` both cap it, and both were set here until the
  // `tkw-a11y-audit` sweep.
  it("leaves pinch zoom unlocked", () => {
    expect(viewport.maximumScale).toBeUndefined();
    expect(viewport.userScalable).toBeUndefined();
  });

  it("still opens at natural scale on a device-width viewport", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
  });
});
