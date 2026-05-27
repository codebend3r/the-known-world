import type { Metadata } from 'next';
import { loadAllCharacters } from '@/lib/content';
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
  const characters = await loadAllCharacters();
  const items: CharacterItem[] = characters
    .filter((c) => !c.frontmatter.draft && !c.frontmatter.placeholder)
    .map((c) => ({
      slug: c.frontmatter.slug,
      name: c.frontmatter.name,
      primaryHouseSlug: c.frontmatter['primary-house'],
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
