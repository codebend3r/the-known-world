import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadHouse,
  loadAllHouses,
  loadAllCastles,
  loadAllPeople,
  renderMarkdown,
} from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';
import { FamilyTree } from '@/components/FamilyTree';
import { Sigil } from '@/components/Sigil';
import { buildFamilyTree } from '@/lib/family-tree';
import type { House } from '@/lib/schemas';

export async function generateStaticParams() {
  const houses = await loadAllHouses();
  return houses
    .filter((h) => !h.frontmatter.draft)
    .map((h) => ({ slug: h.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const house = await loadHouse(slug).catch(() => null);
  if (!house) return { title: 'Not found' };
  return {
    title: `${house.frontmatter.name} · Atlas of the Known World`,
    description: `The roll of ${house.frontmatter.name}, seat at ${house.frontmatter.seat}.`,
  };
}

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

export default async function HousePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [house, castles, people] = await Promise.all([
    loadHouse(slug).catch(() => null),
    loadAllCastles(),
    loadAllPeople(),
  ]);
  if (!house) notFound();

  const seatCastle = castles.find((c) => c.frontmatter.slug === house.frontmatter.seat);
  const html = await renderMarkdown(house.body);
  const tree = buildFamilyTree(slug, people);

  return (
    <ParchmentLayout>
      <div className="house-detail__crest">
        <Sigil
          slug={slug}
          name={house.frontmatter.name.replace(/^House\s+/i, '')}
          size="9rem"
          decorative
        />
      </div>
      <h1>{house.frontmatter.name}</h1>
      <p className="subtitle">&ldquo;{house.frontmatter.words}&rdquo;</p>

      <dl className="house-detail__meta">
        <div>
          <dt>Seat</dt>
          <dd>
            {seatCastle ? (
              <Link href={`/castles/${seatCastle.frontmatter.slug}/`}>
                {seatCastle.frontmatter.name}
              </Link>
            ) : (
              house.frontmatter.seat
            )}
          </dd>
        </div>
        <div>
          <dt>Founded</dt>
          <dd>{formatFounded(house.frontmatter.founded)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{formatStatus(house.frontmatter.status)}</dd>
        </div>
        <div>
          <dt>Sigil</dt>
          <dd>{house.frontmatter.sigil.description}</dd>
        </div>
      </dl>

      <article className="house-detail__body" dangerouslySetInnerHTML={{ __html: html }} />

      <section className="house-detail__tree" aria-labelledby="family-tree-heading">
        <h2 id="family-tree-heading">Family Tree</h2>
        <FamilyTree roots={tree} />
      </section>

      <p className="house-detail__back">
        <Link href="/houses/">← All Houses</Link>
      </p>

      <Sources sources={house.frontmatter.sources} />
    </ParchmentLayout>
  );
}
