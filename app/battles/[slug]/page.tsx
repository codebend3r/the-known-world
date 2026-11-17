import Image from "next/image";
import {
  loadBattle,
  loadAllBattles,
  loadAllHouses,
  loadAllCharacters,
  renderEntryBody,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { EntryPlate } from "@/components/EntryPlate";
import { BattleInfobox } from "@/components/BattleInfobox";
import { formatBattleWhen } from "@/lib/battle-date";
import { findBattleImage } from "@/lib/battle-image";
import { bySlug } from "@/lib/collections";
import styles from "@/app/battles/[slug]/page.module.scss";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllBattles });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadBattle,
    metadata: (battle) => ({
      title: `${battle.frontmatter.name} · Atlas of the Known World`,
    }),
  });
}

export default async function BattlePage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const [battle, allHouses, allCharacters, image] = await Promise.all([
    loadEntryOr404({ load: loadBattle, slug }),
    loadAllHouses(),
    loadAllCharacters(),
    findBattleImage(slug),
  ]);

  const housesBySlug = bySlug(allHouses);
  const charactersBySlug = bySlug(allCharacters);

  const fm = battle.frontmatter;
  const html = await renderEntryBody({
    body: battle.body,
    current: { kind: "battle", slug, mentions: fm.mentions },
  });
  const subtitle = [formatBattleWhen({ start: fm.start, end: fm.end }), fm.war]
    .filter(Boolean)
    .join(" · ");

  return (
    <EntryPlate
      layout="sidebar"
      title={fm.name}
      subtitle={subtitle}
      html={html}
      back={{ href: "/battles/", label: "All Battles" }}
      sources={fm.sources}
      infobox={({ className }) => (
        <BattleInfobox
          battle={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={className}
        />
      )}
    >
      {image && (
        <figure className={styles.figure}>
          <Image
            src={image}
            alt={`Depiction of ${fm.name}`}
            width={1280}
            height={720}
            sizes="(max-width: 768px) 90vw, 720px"
            priority
            className={styles.image}
          />
        </figure>
      )}
    </EntryPlate>
  );
}
