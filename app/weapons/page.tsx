import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllWeapons, loadAllHouses } from "@/lib/content";
import { findWeaponImage } from "@/lib/weapon-image";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredWeaponList,
  type WeaponItem,
} from "@/components/FilteredWeaponList";

export const metadata: Metadata = {
  title: "Weapons · Atlas of the Known World",
  description: "Named blades, ancestral arms, and lost relics of the realm.",
};

export default async function WeaponsPage() {
  const [weapons, houses] = await Promise.all([
    loadAllWeapons(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));
  const visible = weapons.filter((w) => !w.frontmatter.draft);

  const imaged = await Promise.all(
    visible.map(async (w) => ({
      slug: w.frontmatter.slug,
      hasImage: !!(await findWeaponImage(w.frontmatter.slug)),
    })),
  );
  const withImage = new Set(
    imaged.filter((entry) => entry.hasImage).map((entry) => entry.slug),
  );

  const items: WeaponItem[] = visible
    .map((w): WeaponItem => {
      const houseSlug =
        w.frontmatter["current-house"] ?? w.frontmatter["origin-house"] ?? null;
      const region = houseSlug ? regionForHouse(houseSlug, housesBySlug) : null;
      return {
        slug: w.frontmatter.slug,
        name: w.frontmatter.name,
        houseSlug,
        region,
        regionLabel: region ? regionLabel(region) : null,
        hasImage: withImage.has(w.frontmatter.slug),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <PageHeading
        title="Weapons"
        icon={sectionGlyphs.weapons}
        subtitle="Named blades, ancestral arms, and lost relics of the realm."
      />
      <Suspense fallback={<ListSearchSkeleton placeholder="Search weapons…" />}>
        <FilteredWeaponList items={items} />
      </Suspense>
    </ParchmentLayout>
  );
}
