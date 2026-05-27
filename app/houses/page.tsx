import type { Metadata } from 'next';
import Link from 'next/link';
import { loadAllCastles, loadAllHouses } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import type { House } from '@/lib/schemas';

export const metadata: Metadata = {
  title: 'Houses · Atlas of the Known World',
  description: 'The rolls of the great houses of the Seven Kingdoms.',
};

function formatFounded(founded: House['founded']): string {
  const { year, era, precision } = founded;
  if (era === 'AC' || era === 'BC') {
    return `${Math.abs(year)} ${era}`;
  }
  const eraLabel = era
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  return precision === 'legendary' ? `${eraLabel} (legendary)` : eraLabel;
}

function formatStatus(status: House['status']): string {
  return status[0].toUpperCase() + status.slice(1);
}

function firstParagraph(body: string): string {
  return body.trim().split(/\n\n+/)[0]?.trim() ?? '';
}

export default async function HousesPage() {
  const [houses, castles] = await Promise.all([loadAllHouses(), loadAllCastles()]);
  const visible = houses.filter((h) => !h.frontmatter.draft);
  const castleNameBySlug = new Map(
    castles.map((c) => [c.frontmatter.slug, c.frontmatter.name]),
  );

  const sorted = [...visible].sort((a, b) =>
    a.frontmatter.name.localeCompare(b.frontmatter.name),
  );

  return (
    <ParchmentLayout>
      <h1>Houses</h1>
      <p className="subtitle">
        The rolls of the great houses of the Seven Kingdoms.
      </p>
      <ul className="house-list">
        {sorted.map(({ frontmatter, body, slug }) => {
          const seatName = castleNameBySlug.get(frontmatter.seat);
          return (
            <li key={slug} className="house-list__item">
              <header className="house-list__head">
                <h2 className="house-list__name">{frontmatter.name}</h2>
                <p className="house-list__words">&ldquo;{frontmatter.words}&rdquo;</p>
              </header>
              <dl className="house-list__meta">
                <div>
                  <dt>Seat</dt>
                  <dd>
                    {seatName ? (
                      <Link href={`/castles/${frontmatter.seat}/`}>{seatName}</Link>
                    ) : (
                      frontmatter.seat
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Founded</dt>
                  <dd>{formatFounded(frontmatter.founded)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{formatStatus(frontmatter.status)}</dd>
                </div>
                <div>
                  <dt>Sigil</dt>
                  <dd>{frontmatter.sigil.description}</dd>
                </div>
              </dl>
              <p className="house-list__excerpt">{firstParagraph(body)}</p>
            </li>
          );
        })}
      </ul>
    </ParchmentLayout>
  );
}
