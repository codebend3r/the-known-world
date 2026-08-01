import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadDragon,
  loadAllDragons,
  loadAllWeapons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from "@/lib/content";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import { DragonInfobox } from "@/components/DragonInfobox";
import { humanizeSlug } from "@/lib/text";
import { bySlug } from "@/lib/collections";
import styles from "@/app/dragons/[slug]/page.module.scss";

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
  if (!dragon) return { title: "Not found" };
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
  const [dragon, allHouses, allCharacters, allWeapons, allDragons] =
    await Promise.all([
      loadDragon(slug).catch(() => null),
      loadAllHouses(),
      loadAllCharacters(),
      loadAllWeapons(),
      loadAllDragons(),
    ]);
  if (!dragon) notFound();

  const housesBySlug = bySlug(allHouses);
  const charactersBySlug = bySlug(allCharacters);

  const fm = dragon.frontmatter;
  const proseLinks = buildProseLinkIndex({
    allCharacters: allCharacters.map((c) => ({
      slug: c.slug,
      frontmatter: c.frontmatter,
    })),
    allHouses: allHouses.map((h) => ({
      slug: h.slug,
      frontmatter: h.frontmatter,
    })),
    allWeapons: allWeapons.map((w) => ({
      slug: w.slug,
      frontmatter: w.frontmatter,
    })),
    allDragons: allDragons.map((d) => ({
      slug: d.slug,
      frontmatter: d.frontmatter,
    })),
    current: { kind: "dragon", slug, mentions: dragon.frontmatter.mentions },
  });
  const html =
    fm && dragon.body.trim()
      ? await renderMarkdown(dragon.body, { proseLinks })
      : "";
  const house = fm.house ? housesBySlug.get(fm.house) : undefined;
  const subtitle = house
    ? `Of ${house.name}`
    : fm.house
      ? `Of House ${humanizeSlug(fm.house)}`
      : "A wild dragon";

  return (
    <PlateLayout>
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
    </PlateLayout>
  );
}
