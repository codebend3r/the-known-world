import type { CalendarDate } from "@/lib/schemas";
import { humanizeSlug } from "@/lib/text";

export function formatEraDate(date: CalendarDate | null): string {
  if (!date) return "—";
  const { year, era, precision } = date;
  if (era === "AC" || era === "BC") return `${Math.abs(year)} ${era}`;
  const label = humanizeSlug(era);
  return precision === "legendary" ? `${label} (legendary)` : label;
}
