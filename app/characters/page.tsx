import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllCharacters, loadAllHouses } from "@/lib/content";
import { regionForHouse } from "@/lib/regions";
import { findPortrait } from "@/lib/portraits";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredCharacterList,
  type CharacterItem,
} from "@/components/FilteredCharacterList";

export const metadata: Metadata = {
  title: "Characters · Atlas of the Known World",
  description: "The characters of the Known World, listed alphabetically.",
};

export default async function CharactersPage() {
  const [characters, houses] = await Promise.all([
    loadAllCharacters(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));

  const visible = characters.filter(
    (c) => !c.frontmatter.draft && !c.frontmatter.placeholder,
  );
  const portraits = await Promise.all(
    visible.map((c) => findPortrait(c.frontmatter.slug, c.frontmatter.sex)),
  );

  const items: CharacterItem[] = visible
    .map((c, i) => ({
      slug: c.frontmatter.slug,
      name: c.frontmatter.name,
      alias: c.frontmatter.aliases[0] ?? null,
      primaryHouseSlug: c.frontmatter["primary-house"],
      region: regionForHouse(c.frontmatter["primary-house"], housesBySlug),
      portrait: portraits[i],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <PageHeading
        title="Characters"
        subtitle="The lords, ladies, knights, and smallfolk who shaped the Known World."
      />
      <Suspense
        fallback={
          <ListSearchSkeleton placeholder="Search characters…" withControls />
        }
      >
        <FilteredCharacterList items={items} />
      </Suspense>
    </ParchmentLayout>
  );
}
