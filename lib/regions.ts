import type { House } from "@/lib/schemas";

export const REGIONS = {
  stark: { slug: "north", name: "The North" },
  arryn: { slug: "vale", name: "The Vale" },
  tully: { slug: "riverlands", name: "The Riverlands" },
  lannister: { slug: "westerlands", name: "The Westerlands" },
  tyrell: { slug: "reach", name: "The Reach" },
  baratheon: { slug: "stormlands", name: "The Stormlands" },
  martell: { slug: "dorne", name: "Dorne" },
  greyjoy: { slug: "iron-islands", name: "The Iron Islands" },
  targaryen: { slug: "crownlands", name: "The Crownlands" },
} as const;

export type RegionSlug = (typeof REGIONS)[keyof typeof REGIONS]["slug"];

export const REGION_SLUGS = [
  "north",
  "vale",
  "riverlands",
  "westerlands",
  "reach",
  "stormlands",
  "dorne",
  "iron-islands",
  "crownlands",
] as const satisfies readonly RegionSlug[];

const REGION_LABELS = new Map<RegionSlug, string>(
  Object.values(REGIONS).map((r) => [r.slug, r.name]),
);

function isGreatHouseSlug(slug: string): slug is keyof typeof REGIONS {
  return Object.hasOwn(REGIONS, slug);
}

export function regionLabel(slug: RegionSlug | null): string | null {
  return slug ? (REGION_LABELS.get(slug) ?? null) : null;
}

export function regionForHouse(
  slug: string | null,
  housesBySlug: Map<string, House>,
): RegionSlug | null {
  const seen = new Set<string>();
  let current: string | null = slug;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (isGreatHouseSlug(current)) {
      return REGIONS[current].slug;
    }
    const house = housesBySlug.get(current);
    if (!house) return null;
    if (house.region) return house.region;
    current = house.liege;
  }
  return null;
}
