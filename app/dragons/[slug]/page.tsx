import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadDragon,
  loadAllDragons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';
import { DragonInfobox } from '@/components/DragonInfobox';
import { humanizeSlug } from '@/components/Infobox';
import styles from '@/app/dragons/[slug]/page.module.css';

export async function generateStaticParams() {
  const dragons = await loadAllDragons();
  return dragons
    .filter((d) => !d.frontmatter.draft)
    .map((d) => ({ slug: d.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dragon = await loadDragon(slug).catch(() => null);
  if (!dragon) return { title: 'Not found' };
  return {
    title: `${dragon.frontmatter.name} · Atlas of the Known World`,
  };
}

export default async function DragonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [dragon, allHouses, allCharacters] = await Promise.all([
    loadDragon(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
  ]);
  if (!dragon) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );

  const fm = dragon.frontmatter;
  const html = fm && dragon.body.trim() ? await renderMarkdown(dragon.body) : '';
  const house = fm.house ? housesBySlug.get(fm.house) : undefined;
  const subtitle = house
    ? `Of ${house.name}`
    : fm.house
      ? `Of House ${humanizeSlug(fm.house)}`
      : 'A wild dragon';

  return (
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <DragonInfobox
          dragon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={styles.infobox}
        />
        <div className={styles.main}>
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/dragons/">← All Dragons</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </ParchmentLayout>
  );
}
