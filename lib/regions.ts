import type { CSSProperties } from "react";
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

// Heraldic colour travels into a component's module as a custom property, so
// the module keeps the token and the caller only names the region. No region
// leaves the property unset and the module's own fallback applies.
export function regionColorStyle({
  region,
  property,
}: {
  region: RegionSlug | null;
  property: `--${string}`;
}): CSSProperties {
  return region ? { [property]: `var(--region-color-${region})` } : {};
}

// `seen` stops a liege cycle that never reaches a great house.
function climbLieges({
  slug,
  housesBySlug,
  seen,
}: {
  slug: string | null;
  housesBySlug: Map<string, House>;
  seen: ReadonlySet<string>;
}): RegionSlug | null {
  if (!slug || seen.has(slug)) return null;
  if (isGreatHouseSlug(slug)) return REGIONS[slug].slug;
  const house = housesBySlug.get(slug);
  if (!house) return null;
  if (house.region) return house.region;
  return climbLieges({
    slug: house.liege,
    housesBySlug,
    seen: new Set([...seen, slug]),
  });
}

export function regionForHouse({
  slug,
  housesBySlug,
}: {
  slug: string | null;
  housesBySlug: Map<string, House>;
}): RegionSlug | null {
  return climbLieges({ slug, housesBySlug, seen: new Set() });
}
