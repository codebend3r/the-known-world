import { describe, expect, it } from "bun:test";
import { loadDesignTokens, parseDesignTokens } from "@/lib/design-tokens";

const STYLESHEET = `@use "breakpoints" as bp;

:root {
  // ── ground ──
  --tkw-bg: #14100e;
  --tkw-glow:
    0 0 0 1px rgba(200, 162, 74, 0.35),
    0 16px 34px -18px rgba(200, 162, 74, 0.55);
}

body {
  --not-a-token: 1px;
}
`;

describe("parseDesignTokens", () => {
  it("reads a single-line declaration", () => {
    expect(parseDesignTokens(STYLESHEET).value("--tkw-bg")).toBe("#14100e");
  });

  it("collapses a value that wraps across lines", () => {
    expect(parseDesignTokens(STYLESHEET).value("--tkw-glow")).toBe(
      "0 0 0 1px rgba(200, 162, 74, 0.35), 0 16px 34px -18px rgba(200, 162, 74, 0.55)",
    );
  });

  it("keeps the `:root` block verbatim, comments included", () => {
    const { source } = parseDesignTokens(STYLESHEET);
    expect(source.startsWith(":root {\n  // ── ground ──")).toBe(true);
    expect(source.endsWith("rgba(200, 162, 74, 0.55);\n}")).toBe(true);
  });

  it("ignores custom properties declared outside `:root`", () => {
    expect(() => parseDesignTokens(STYLESHEET).value("--not-a-token")).toThrow(
      "--not-a-token",
    );
  });

  it("throws for a token that is not declared", () => {
    expect(() => parseDesignTokens(STYLESHEET).value("--tkw-missing")).toThrow(
      "--tkw-missing",
    );
  });

  it("throws when the stylesheet has no `:root` block", () => {
    expect(() => parseDesignTokens("body { color: red; }")).toThrow(":root");
  });
});

describe("loadDesignTokens", () => {
  it("reads the tokens `styles/globals.scss` declares", async () => {
    const tokens = await loadDesignTokens();
    expect(tokens.source.startsWith(":root {")).toBe(true);
    expect(tokens.value("--tkw-gold")).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.value("--house-stark-metal")).toBeDefined();
  });
});
