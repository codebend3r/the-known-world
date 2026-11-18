const ROMAN_NUMERAL = /^[IVXLCDM]+$/;
const LABEL_CHAR_WIDTH = 5.5;
const LABEL_HORIZONTAL_PADDING = 6;
const LABEL_FONT_SIZE = 9;
// Space between the top of a person's dot and the label's baseline.
const LABEL_GAP = 8;

export function wasKing(titles: ReadonlyArray<string>): boolean {
  return titles.some((t) => t.startsWith("King "));
}

export function formatLabelText({
  name,
  titles,
}: {
  name: string;
  titles: ReadonlyArray<string>;
}): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const lastInitial = `${last.charAt(0).toUpperCase()}.`;
  if (wasKing(titles)) {
    const numeral = parts.slice(1, -1).find((p) => ROMAN_NUMERAL.test(p));
    if (numeral) return `${parts[0]} ${numeral} ${lastInitial}`;
  }
  return `${parts[0]} ${lastInitial}`;
}

export function estimateLabelWidth({
  name,
  titles,
}: {
  name: string;
  titles: ReadonlyArray<string>;
}): number {
  const text = formatLabelText({ name, titles });
  return text.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING * 2;
}

/**
 * Where a person's label sits above their dot: the text anchored at `x` on
 * `baseline`, and the backing rect sized to it, snapped to whole units so its
 * edges stay crisp.
 */
export function labelBox({
  x,
  y,
  dotRadius,
  name,
  titles,
}: {
  x: number;
  y: number;
  dotRadius: number;
  name: string;
  titles: ReadonlyArray<string>;
}): {
  text: string;
  x: number;
  baseline: number;
  rect: { x: number; y: number; width: number; height: number };
} {
  const width = Math.round(estimateLabelWidth({ name, titles }));
  const baseline = y - dotRadius - LABEL_GAP;
  return {
    text: formatLabelText({ name, titles }),
    x,
    baseline,
    rect: {
      x: Math.round(x - width / 2),
      y: Math.round(baseline - LABEL_FONT_SIZE + 1),
      width,
      height: Math.round(LABEL_FONT_SIZE + 2),
    },
  };
}

export function formatTitle({
  name,
  alias,
}: {
  name: string;
  alias: string | null;
}): string {
  return alias ? `${name} (${alias})` : name;
}

export function formatLifespan({
  born,
  died,
}: {
  born: number | null;
  died: number | null;
}): string | null {
  if (born === null && died === null) return null;
  const b = born === null ? "?" : String(born);
  const d = died === null ? "" : String(died);
  return d ? `${b}–${d}` : `${b}–`;
}
