import { REGION_SLUGS, regionLabel, type RegionSlug } from "@/lib/regions";

export type RegionGroup<T> = {
  slug: string;
  label: string;
  items: T[];
};

/**
 * Buckets houses into the nine regions in canonical order, dropping empty
 * regions, with every region-less house gathered last under "Other Houses".
 */
export function groupHousesByRegion<T extends { region: RegionSlug | null }>({
  houses,
}: {
  houses: readonly T[];
}): RegionGroup<T>[] {
  const known = REGION_SLUGS.map((slug) => ({
    slug,
    label: regionLabel(slug) ?? slug,
    items: houses.filter((house) => house.region === slug),
  })).filter((group) => group.items.length > 0);
  const other = houses.filter((house) => house.region === null);
  return other.length > 0
    ? [...known, { slug: "other", label: "Other Houses", items: other }]
    : known;
}
