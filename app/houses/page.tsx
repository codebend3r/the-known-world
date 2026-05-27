import type { Metadata } from 'next';
import Link from 'next/link';
import { loadAllHouses } from '@/lib/content';
import { regionForHouse } from '@/lib/regions';
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
  const housesBySlug = new Map(visible.map((h) => [h.slug, h.frontmatter]));

  return (
    <ParchmentLayout>
      <h1>Houses</h1>
      <p className="subtitle">
        The rolls of the great houses of the Seven Kingdoms.
      </p>
      <ul className="house-list">
        {sorted.map(({ frontmatter, slug }) => {
          const region = regionForHouse(slug, housesBySlug);
          const cardClass = region
            ? `house-list__card house-list__card--region-${region}`
            : 'house-list__card';
          return (
            <li key={slug} className="house-list__item">
              <Link href={`/houses/${slug}/`} className={cardClass}>
                <Sigil
                  slug={slug}
                  name={shortName(frontmatter.name)}
                  size="4.5rem"
                  decorative
                />
                <span className="house-list__name">{shortName(frontmatter.name)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </ParchmentLayout>
  );
}
