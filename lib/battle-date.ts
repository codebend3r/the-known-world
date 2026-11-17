import type { CalendarDate } from "@/lib/schemas";
import { humanizeSlug } from "@/lib/text";

type ReckonedEra = Extract<CalendarDate["era"], "AC" | "BC">;

/** AC and BC count years from the Conquest; every other era is a named age. */
export function isReckonedEra(era: CalendarDate["era"]): era is ReckonedEra {
  return era === "AC" || era === "BC";
}

function eraYearLabel(d: CalendarDate): string {
  if (isReckonedEra(d.era)) return `${Math.abs(d.year)} ${d.era}`;
  return humanizeSlug(d.era);
}

/** A date is approximate (and rendered with an asterisk) unless it is exact. */
export function isApproximate(d: CalendarDate): boolean {
  return d.precision !== "exact";
}

/** Absolute year on a single axis (BC negative), for chronological sorting. */
export function absoluteYear(d: CalendarDate): number {
  return d.era === "BC" ? -d.year : d.year;
}

function spanLabel({
  start,
  end,
}: {
  start: CalendarDate;
  end: CalendarDate;
}): string {
  if (start.year === end.year && start.era === end.era) {
    return eraYearLabel(start);
  }
  if (isReckonedEra(start.era) && start.era === end.era) {
    return `${Math.abs(start.year)} to ${Math.abs(end.year)} ${end.era}`;
  }
  return `${eraYearLabel(start)} to ${eraYearLabel(end)}`;
}

/**
 * Human label for a battle's span. Single dates collapse to one year; ranges
 * read "282 to 283 AC". A trailing asterisk marks an approximate span.
 */
export function formatBattleWhen({
  start,
  end,
}: {
  start: CalendarDate;
  end: CalendarDate;
}): string {
  const isSpanApproximate = isApproximate(start) || isApproximate(end);
  return `${spanLabel({ start, end })}${isSpanApproximate ? "*" : ""}`;
}
