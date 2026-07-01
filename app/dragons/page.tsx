import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllDragons, loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredDragonList,
  type DragonItem,
} from "@/components/FilteredDragonList";

export const metadata: Metadata = {
  title: "Dragons · Atlas of the Known World",
  description: "Of the dragons that were and the dragons that are.",
};

export default async function DragonsPage() {
  const [dragons, houses] = await Promise.all([
    loadAllDragons(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));
  const visible = dragons.filter((d) => !d.frontmatter.draft);

  const items: DragonItem[] = visible
    .map((d): DragonItem => {
      const houseSlug = d.frontmatter.house;
      const region = houseSlug ? regionForHouse(houseSlug, housesBySlug) : null;
      return {
        slug: d.frontmatter.slug,
        name: d.frontmatter.name,
        houseSlug,
        region,
        regionLabel: region ? regionLabel(region) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <PageHeading
        title="Dragons"
        icon={sectionGlyphs.dragons}
        subtitle="Of the dragons that were and the dragons that are."
      />
      <Suspense fallback={<ListSearchSkeleton placeholder="Search dragons…" />}>
        <FilteredDragonList items={items} />
      </Suspense>
    </ParchmentLayout>
  );
}
