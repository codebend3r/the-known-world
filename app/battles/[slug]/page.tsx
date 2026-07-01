import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  loadBattle,
  loadAllBattles,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from "@/lib/content";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { Sources } from "@/components/Sources";
import { BattleInfobox } from "@/components/BattleInfobox";
import { formatBattleWhen } from "@/lib/battle-date";
import { findBattleImage } from "@/lib/battle-image";
import styles from "@/app/battles/[slug]/page.module.scss";

export async function generateStaticParams() {
  const battles = await loadAllBattles();
  return battles
    .filter((b) => !b.frontmatter.draft)
    .map((b) => ({ slug: b.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const battle = await loadBattle(slug).catch(() => null);
  if (!battle) return { title: "Not found" };
  return {
    title: `${battle.frontmatter.name} · Atlas of the Known World`,
  };
}

export default async function BattlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [battle, allHouses, allCharacters, image] = await Promise.all([
    loadBattle(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
    findBattleImage(slug),
  ]);
  if (!battle) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );

  const fm = battle.frontmatter;
  const html = battle.body.trim() ? await renderMarkdown(battle.body) : "";
  const subtitle = [formatBattleWhen(fm.start, fm.end), fm.war]
    .filter(Boolean)
    .join(" · ");

  return (
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <BattleInfobox
          battle={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={styles.infobox}
        />
        <div className={styles.main}>
          {image && (
            <figure className={styles.figure}>
              <Image
                src={image}
                alt={fm.name}
                width={1280}
                height={720}
                sizes="(max-width: 768px) 90vw, 720px"
                priority
                className={styles.image}
              />
            </figure>
          )}
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/battles/">← All Battles</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </ParchmentLayout>
  );
}
