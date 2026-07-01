import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredHouseList,
  type HouseItem,
} from "@/components/FilteredHouseList";

export const metadata: Metadata = {
  title: "Houses · Atlas of the Known World",
  description: "The rolls of the great houses of the Seven Kingdoms.",
};

function shortName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

export default async function HousesPage() {
  const houses = await loadAllHouses();
  const visible = houses.filter((h) => !h.frontmatter.draft);
  const housesBySlug = new Map(visible.map((h) => [h.slug, h.frontmatter]));

  const items: HouseItem[] = visible
    .map((h) => {
      const region = regionForHouse(h.frontmatter.slug, housesBySlug);
      return {
        slug: h.frontmatter.slug,
        name: shortName(h.frontmatter.name),
        region,
        regionLabel: regionLabel(region),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <PageHeading
        title="Houses"
        subtitle="The rolls of the great houses of the Seven Kingdoms."
      />
      <Suspense
        fallback={
          <ListSearchSkeleton placeholder="Search houses…" withControls />
        }
      >
        <FilteredHouseList items={items} />
      </Suspense>
    </ParchmentLayout>
  );
}
