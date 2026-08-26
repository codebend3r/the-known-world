/**
 * Contrast between the ink and surface tokens in `styles/globals.scss`.
 *
 * Nothing in JSX to read here: this parses the token sheet and compares
 * declared colours, which is why it lives apart from the JSX checks.
 */
import fs from "node:fs/promises";
import path from "node:path";

const TOKEN_SHEET = "styles/globals.scss";

/** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
export type ContrastRow = {
  foreground: string;
  background: string;
  ratio: number;
  passesText: boolean;
  passesLarge: boolean;
};

// ── colour contrast ──────────────────────────────────────────────────

const FOREGROUND_TOKENS = [
  "--tkw-ink",
  "--tkw-ink-body",
  "--tkw-ink-muted",
  "--tkw-ink-dim",
  "--tkw-gold",
  "--tkw-gold-bright",
  "--tkw-extant",
  "--tkw-deposed",
  "--tkw-contested",
  "--tkw-attainted",
  "--tkw-extinct",
] as const;

const BACKGROUND_TOKENS = [
  "--tkw-bg",
  "--tkw-bg-deep",
  "--tkw-surface",
  "--tkw-surface-solid",
  "--tkw-surface-raised",
] as const;

/** Every translucent surface composites over the page ground, never over white. */
const COMPOSITE_BASE = "--tkw-bg";

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgb | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(
      value.trim(),
    );
  if (!rgba) return null;
  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

function composite({ over, under }: { over: Rgb; under: Rgb }): Rgb {
  return {
    r: over.r * over.a + under.r * (1 - over.a),
    g: over.g * over.a + under.g * (1 - over.a),
    b: over.b * over.a + under.b * (1 - over.a),
    a: 1,
  };
}

function relativeLuminance(color: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrastRatio({
  foreground,
  background,
}: {
  foreground: Rgb;
  background: Rgb;
}): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

export async function auditContrast(): Promise<ContrastRow[]> {
  const sheet = await fs.readFile(
    path.join(process.cwd(), TOKEN_SHEET),
    "utf-8",
  );
  const tokens = new Map(
    [...sheet.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gi)].flatMap((match) => {
      const color = parseColor(match[2]);
      return color === null ? [] : [[match[1], color] as const];
    }),
  );
  const base = tokens.get(COMPOSITE_BASE);
  if (!base) return [];

  const solid = (name: string): Rgb | null => {
    const raw = tokens.get(name);
    if (!raw) return null;
    return raw.a === 1 ? raw : composite({ over: raw, under: base });
  };

  return BACKGROUND_TOKENS.flatMap((backgroundName) => {
    const background = solid(backgroundName);
    if (background === null) return [];
    return FOREGROUND_TOKENS.flatMap((foregroundName) => {
      const foreground = solid(foregroundName);
      if (foreground === null) return [];
      const ratio = contrastRatio({ foreground, background });
      return [
        {
          foreground: foregroundName,
          background: backgroundName,
          ratio: Math.round(ratio * 100) / 100,
          passesText: ratio >= AA_TEXT,
          passesLarge: ratio >= AA_LARGE,
        },
      ];
    });
  });
}
