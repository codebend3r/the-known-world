import type { Metadata } from "next";
import { loadAllWeapons, loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
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
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>Weapons</h1>
      <p className="subtitle">
        Named blades, ancestral arms, and lost relics of the realm.
      </p>
      <FilteredWeaponList items={items} />
    </ParchmentLayout>
  );
}
