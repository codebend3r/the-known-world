import type { Metadata } from 'next';
import { loadAllPeople } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { FilteredPeopleList, type PersonItem } from '@/components/FilteredPeopleList';

export const metadata: Metadata = {
  title: 'People · Atlas of the Known World',
  description: 'The characters of the Known World, listed alphabetically.',
};

export default async function PeoplePage() {
  const people = await loadAllPeople();
  const items: PersonItem[] = people
    .filter((p) => !p.frontmatter.draft && !p.frontmatter.placeholder)
    .map((p) => ({
      slug: p.frontmatter.slug,
      name: p.frontmatter.name,
      primaryHouseSlug: p.frontmatter['primary-house'],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>People</h1>
      <p className="subtitle">
        The characters of the Known World, listed alphabetically.
      </p>
      <FilteredPeopleList items={items} />
    </ParchmentLayout>
  );
}
