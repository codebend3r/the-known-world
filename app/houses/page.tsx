import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { shortHouseName } from "@/lib/text";
import { bySlug, compareByName } from "@/lib/collections";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredHouseList,
  type HouseItem,
} from "@/components/FilteredHouseList";

export const metadata: Metadata = {
  title: "Houses · Atlas of the Known World",
  description: "The rolls of the great houses of the Seven Kingdoms.",
};

export default async function HousesPage() {
  const houses = await loadAllHouses();
  const visible = houses.filter((h) => !h.frontmatter.draft);
  const housesBySlug = bySlug(visible);

  const items: HouseItem[] = visible
    .map((h) => {
      const region = regionForHouse(h.frontmatter.slug, housesBySlug);
      return {
        slug: h.frontmatter.slug,
        name: shortHouseName(h.frontmatter.name),
        region,
        regionLabel: regionLabel(region),
        extinct: h.frontmatter.status === "extinct",
        rank: h.frontmatter.rank,
      };
    })
    .sort(compareByName);

  return (
    <PlateLayout>
      <PageHeading
        title="Houses"
        eyebrow="Collection 03"
        icon={sectionGlyphs.houses}
        subtitle="The rolls of the great houses of the Seven Kingdoms."
      />
      <Suspense
        fallback={
          <ListSearchSkeleton placeholder="Search houses…" withControls />
        }
      >
        <FilteredHouseList items={items} />
      </Suspense>
    </PlateLayout>
  );
}
