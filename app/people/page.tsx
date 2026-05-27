import type { Metadata } from 'next';
import { loadAllPeople } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sigil } from '@/components/Sigil';

export const metadata: Metadata = {
  title: 'People · Atlas of the Known World',
  description: 'The characters of the Known World, listed alphabetically.',
};

export default async function PeoplePage() {
  const people = await loadAllPeople();
  const visible = people.filter(
    (p) => !p.frontmatter.draft && !p.frontmatter.placeholder,
  );
  const sorted = [...visible].sort((a, b) =>
    a.frontmatter.name.localeCompare(b.frontmatter.name),
  );

  return (
    <ParchmentLayout>
      <h1>People</h1>
      <p className="subtitle">
        The characters of the Known World, listed alphabetically.
      </p>
      <ul className="people-list">
        {sorted.map(({ frontmatter, slug }) => (
          <li key={slug} className="people-list__item">
            <div className="people-list__card">
              <Sigil
                slug={frontmatter['primary-house']}
                name={frontmatter.name}
                size="3.25rem"
                decorative
              />
              <span className="people-list__name">{frontmatter.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </ParchmentLayout>
  );
}
