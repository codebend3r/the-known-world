import { absoluteYear, isReckonedEra } from "@/lib/battle-date";
import type { CalendarDate, Character } from "@/lib/schemas";

/** Only a single reckoned year (AC or BC, exact or year precision) can be aged. */
export function yieldsAge(date: CalendarDate): boolean {
  return (
    isReckonedEra(date.era) &&
    (date.precision === "year" || date.precision === "exact")
  );
}

/**
 * Years lived, or null when the dates cannot support a number.
 *
 * Subtracting the raw `year` fields would be wrong across the Conquest: `BC`
 * years are positive magnitudes, so a birth in 27 BC and a death in 37 AC read
 * as ten years apart. `absoluteYear` maps both onto the single signed axis
 * first, which is the same axis the timeline sorts on.
 */
export function ageAtDeath({
  born,
  died,
}: {
  born: Character["born"];
  died: Character["died"];
}): number | null {
  if (!born || !died) return null;
  if (!yieldsAge(born) || !yieldsAge(died)) return null;
  const age = absoluteYear(died) - absoluteYear(born);
  if (age < 0) return null;
  return age;
}
