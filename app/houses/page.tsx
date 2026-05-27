import type { Metadata } from 'next';
import Link from 'next/link';
import { loadAllHouses } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sigil } from '@/components/Sigil';

export const metadata: Metadata = {
  title: 'Houses · Atlas of the Known World',
  description: 'The rolls of the great houses of the Seven Kingdoms.',
};

function shortName(fullName: string): string {
  return fullName.replace(/^House\s+/i, '');
}

export default async function HousesPage() {
  const houses = await loadAllHouses();
  const visible = houses.filter((h) => !h.frontmatter.draft);
  const sorted = [...visible].sort((a, b) =>
    shortName(a.frontmatter.name).localeCompare(shortName(b.frontmatter.name)),
  );

  return (
    <ParchmentLayout>
      <h1>Houses</h1>
      <p className="subtitle">
        The rolls of the great houses of the Seven Kingdoms.
      </p>
      <ul className="house-list">
        {sorted.map(({ frontmatter, slug }) => (
          <li key={slug} className="house-list__item">
            <Link href={`/houses/${slug}/`} className="house-list__card">
              <Sigil
                slug={slug}
                name={shortName(frontmatter.name)}
                size="4.5rem"
                decorative
              />
              <span className="house-list__name">{shortName(frontmatter.name)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ParchmentLayout>
  );
}
