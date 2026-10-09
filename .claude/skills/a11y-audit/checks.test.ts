import { describe, expect, it } from "bun:test";
import { checkImages, checkInteractions, checkViewport } from "./checks";
import { analyse } from "./jsx-source";

function source(raw: string) {
  return analyse({ filePath: "app/layout.tsx", raw });
}

describe("checkViewport", () => {
  it("reports a locked viewport on the line that exports it", () => {
    const file = source(
      [
        'import type { Viewport } from "next";',
        "",
        "export const viewport: Viewport = {",
        "  maximumScale: 1,",
        "  userScalable: false,",
        "};",
      ].join("\n"),
    );

    expect(checkViewport(file)).toEqual([
      {
        file: "app/layout.tsx",
        line: 3,
        element: "viewport",
        code: "viewport-zoom-locked",
        severity: "error",
        message:
          "`userScalable: false` and `maximumScale` blocks pinch zoom. WCAG 1.4.4 requires 200% scaling.",
      },
    ]);
  });

  it("allows a viewport that leaves zoom alone", () => {
    const file = source(
      'export const viewport = { themeColor: "#000", maximumScale: 5 };',
    );

    expect(checkViewport(file)).toEqual([]);
  });

  it("ignores files with no viewport export", () => {
    expect(checkViewport(source("const maximumScale = 1;"))).toEqual([]);
  });
});

describe("checkImages", () => {
  it("reports both error and warn severities from one file", () => {
    const file = source(
      [
        "export function Art() {",
        "  return (",
        "    <>",
        '      <img src="/a.png" />',
        '      <img src="/b.png" alt="Image of a castle" />',
        "    </>",
        "  );",
        "}",
      ].join("\n"),
    );

    expect(
      checkImages(file).map(({ code, severity, line }) => ({
        code,
        severity,
        line,
      })),
    ).toEqual([
      { code: "img-no-alt", severity: "error", line: 4 },
      { code: "img-alt-noise", severity: "warn", line: 5 },
    ]);
  });
});

describe("checkInteractions", () => {
  it("collects every finding a single element earns", () => {
    const file = source(
      [
        "export function Pane() {",
        "  return <div onClick={go} tabIndex={0}>x</div>;",
        "}",
      ].join("\n"),
    );

    expect(checkInteractions(file).map(({ code }) => code)).toEqual([
      "static-interaction",
      "click-no-key",
      "noninteractive-tabindex",
    ]);
  });
});
