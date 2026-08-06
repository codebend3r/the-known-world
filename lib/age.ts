import { absoluteYear } from "@/lib/battle-date";
import type { Character } from "@/lib/schemas";

/**
 * Years lived, or null when the dates cannot support a number.
 *
 * Subtracting the raw `year` fields would be wrong across the Conquest: `BC`
 * years are positive magnitudes, so a birth in 27 BC and a death in 37 AC read
 * as ten years apart. `absoluteYear` maps both onto the single signed axis
 * first, which is the same axis the timeline sorts on.
 */
export function ageAtDeath(
  born: Character["born"],
  died: Character["died"],
): number | null {
  if (!born || !died) return null;
  if (born.era !== "AC" && born.era !== "BC") return null;
  if (died.era !== "AC" && died.era !== "BC") return null;
  if (born.precision !== "year" && born.precision !== "exact") return null;
  if (died.precision !== "year" && died.precision !== "exact") return null;
  const age = absoluteYear(died) - absoluteYear(born);
  if (age < 0) return null;
  return age;
}
