import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadHouse,
  loadAllHouses,
  loadAllCastles,
  loadAllCharacters,
  renderMarkdown,
} from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';
import { FamilyTree } from '@/components/FamilyTree';
import { HouseInfobox } from '@/components/HouseInfobox';
import { buildFamilyTree } from '@/lib/family-tree';

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

export default async function HousePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [house, allHouses, castles, characters] = await Promise.all([
    loadHouse(slug).catch(() => null),
    loadAllHouses(),
    loadAllCastles(),
    loadAllCharacters(),
  ]);
  if (!house) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const castlesBySlug = new Map(castles.map((c) => [c.slug, c.frontmatter]));
  const charactersBySlug = new Map(characters.map((c) => [c.slug, c.frontmatter]));

  const html = await renderMarkdown(house.body);
  const tree = buildFamilyTree(slug, characters);

  return (
    <ParchmentLayout>
      <HouseInfobox
        house={house.frontmatter}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
      />
      <h1>{house.frontmatter.name}</h1>
      {house.frontmatter.words && (
        <p className="subtitle">&ldquo;{house.frontmatter.words}&rdquo;</p>
      )}

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
