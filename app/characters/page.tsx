import type { Metadata } from "next";
import { loadAllCharacters, loadAllHouses } from "@/lib/content";
import { regionForHouse } from "@/lib/regions";
import { findPortrait } from "@/lib/portraits";
import { cdnImage } from "@/lib/cdn-image";
import { ParchmentLayout } from "@/components/ParchmentLayout";
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
      portrait: cdnImage(portraits[i], { h: 180, fm: "webp", q: 80 }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>Characters</h1>
      <FilteredCharacterList items={items} />
    </ParchmentLayout>
  );
}
