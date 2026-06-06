const ROMAN_NUMERAL = /^[IVXLCDM]+$/;
const LABEL_CHAR_WIDTH = 5.5;
const LABEL_HORIZONTAL_PADDING = 6;

export function wasKing(titles: ReadonlyArray<string>): boolean {
  return titles.some((t) => t.startsWith("King "));
}

export function formatLabelText(
  name: string,
  titles: ReadonlyArray<string>,
): string {
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

export function estimateLabelWidth(
  name: string,
  titles: ReadonlyArray<string>,
): number {
  const text = formatLabelText(name, titles);
  return text.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING * 2;
}
