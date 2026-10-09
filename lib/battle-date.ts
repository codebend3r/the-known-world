import type { Battle } from "@/lib/schemas";

type BattleDate = Battle["start"];

function eraYearLabel(d: BattleDate): string {
  if (d.era === "AC" || d.era === "BC") return `${Math.abs(d.year)} ${d.era}`;
  return d.era
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** A date is approximate (and rendered with an asterisk) unless it is exact. */
export function isApproximate(d: BattleDate): boolean {
  return d.precision !== "exact";
}

/** Absolute year on a single axis (BC negative), for chronological sorting. */
export function absoluteYear(d: BattleDate): number {
  return d.era === "BC" ? -d.year : d.year;
}

/**
 * Human label for a battle's span. Single dates collapse to one year; ranges
 * read "282 to 283 AC". A trailing asterisk marks an approximate span.
 */
export function formatBattleWhen({
  start,
  end,
}: {
  start: BattleDate;
  end: BattleDate;
}): string {
  const isSpanApproximate = isApproximate(start) || isApproximate(end);
  const isSameYear = start.year === end.year && start.era === end.era;

  const asterisk = isSpanApproximate ? "*" : "";

  if (isSameYear) return `${eraYearLabel(start)}${asterisk}`;
  if ((start.era === "AC" || start.era === "BC") && start.era === end.era) {
    return `${Math.abs(start.year)} to ${Math.abs(end.year)} ${end.era}${asterisk}`;
  }
  return `${eraYearLabel(start)} to ${eraYearLabel(end)}${asterisk}`;
}
