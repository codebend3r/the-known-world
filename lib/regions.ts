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

export const REGION_SLUGS: readonly RegionSlug[] = Object.values(REGIONS).map(
  ({ slug }) => slug,
);

const REGION_LABELS = new Map<RegionSlug, string>(
  Object.values(REGIONS).map((r) => [r.slug, r.name]),
);

function isGreatHouseSlug(slug: string): slug is keyof typeof REGIONS {
  return Object.hasOwn(REGIONS, slug);
}

export function regionLabel(slug: RegionSlug | null): string | null {
  return slug ? (REGION_LABELS.get(slug) ?? null) : null;
}

export function regionForHouse({
  slug,
  housesBySlug,
}: {
  slug: string | null;
  housesBySlug: Map<string, House>;
}): RegionSlug | null {
  const climb = ({
    current,
    seen,
  }: {
    current: string | null;
    seen: ReadonlySet<string>;
  }): RegionSlug | null => {
    if (!current || seen.has(current)) return null;
    if (isGreatHouseSlug(current)) {
      return REGIONS[current].slug;
    }
    const house = housesBySlug.get(current);
    if (!house) return null;
    if (house.region) return house.region;
    return climb({ current: house.liege, seen: new Set([...seen, current]) });
  };
  return climb({ current: slug, seen: new Set() });
}
