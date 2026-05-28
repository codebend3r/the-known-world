import type { Metadata } from 'next';
import { loadAllCharacters, loadAllHouses } from '@/lib/content';
import { regionForHouse } from '@/lib/regions';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import {
  FilteredCharacterList,
  type CharacterItem,
} from '@/components/FilteredCharacterList';

export const metadata: Metadata = {
  title: 'Characters · Atlas of the Known World',
  description: 'The characters of the Known World, listed alphabetically.',
};

export default async function CharactersPage() {
  const [characters, houses] = await Promise.all([
    loadAllCharacters(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));

  const items: CharacterItem[] = characters
    .filter((c) => !c.frontmatter.draft && !c.frontmatter.placeholder)
    .map((c) => ({
      slug: c.frontmatter.slug,
      name: c.frontmatter.name,
      alias: c.frontmatter.aliases[0] ?? null,
      primaryHouseSlug: c.frontmatter['primary-house'],
      region: regionForHouse(c.frontmatter['primary-house'], housesBySlug),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>Characters</h1>
      <p className="subtitle">
        The characters of the Known World, listed alphabetically.
      </p>
      <FilteredCharacterList items={items} />
    </ParchmentLayout>
  );
}
