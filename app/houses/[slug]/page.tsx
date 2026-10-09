import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadCastle,
  loadHouse,
  loadAllHouses,
  loadAllCastles,
  loadAllCharacters,
  loadAllWeapons,
  loadAllDragons,
  loadAllBattles,
  loadAllEvents,
  renderMarkdown,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import { PlateLayout } from "@/components/PlateLayout";
import { FiligreeRule } from "@/components/Filigree";
import { Sources } from "@/components/Sources";
import { FamilyTreeViews } from "@/components/FamilyTreeViews";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import { layoutFamilyTree } from "@/lib/family-tree-layout";
import { findPortrait } from "@/lib/portraits";
import { HouseInfobox } from "@/components/HouseInfobox";
import { humanizeSlug } from "@/lib/text";
import { HouseSearchInput } from "@/components/HouseSearchInput";
import { buildFamilyTree } from "@/lib/family-tree";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { bySlug } from "@/lib/collections";
import { cx } from "@/lib/cx";
import styles from "@/app/houses/[slug]/page.module.scss";

export async function generateStaticParams() {
  const houses = await loadAllHouses();
  return houses
    .filter((h) => !h.frontmatter.draft)
    .map((h) => ({ slug: h.frontmatter.slug }));
}

export async function generateMetadata({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const house = await loadHouse(slug).catch(() => null);
  if (!house) return { title: "Not found" };
  const { name, seat } = house.frontmatter;
  const seatName =
    seat === null
      ? null
      : ((await loadCastle(seat).catch(() => null))?.frontmatter.name ??
        humanizeSlug(seat));
  return {
    title: `${name} · Atlas of the Known World`,
    description: seatName
      ? `The roll of ${name}, seat at ${seatName}.`
      : `The roll of ${name}.`,
  };
}

export default async function HousePage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const [
    house,
    allHouses,
    castles,
    characters,
    allWeapons,
    allDragons,
    allBattles,
    allEvents,
  ] = await Promise.all([
    loadHouse(slug).catch(() => null),
    loadAllHouses(),
    loadAllCastles(),
    loadAllCharacters(),
    loadAllWeapons(),
    loadAllDragons(),
    loadAllBattles(),
    loadAllEvents(),
  ]);
  if (!house) notFound();

  const housesBySlug = bySlug(allHouses);
  const castlesBySlug = bySlug(castles);
  const charactersBySlug = bySlug(characters);
  const weaponsBySlug = bySlug(allWeapons);
  const dragonsForHouse = allDragons
    .map((d) => d.frontmatter)
    .filter((d) => d.house === slug && !d.draft);

  const proseLinks = buildProseLinkIndex({
    allCharacters: characters.map((c) => ({
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
    allCastles: castles,
    allBattles,
    allEvents,
    current: { kind: "house", slug, mentions: house.frontmatter.mentions },
  });
  const html = await renderMarkdown({ source: house.body, proseLinks });
  const tree = buildFamilyTree({ houseSlug: slug, people: characters });
  const enriched = await enrichTreeWithPortraits({ roots: tree, findPortrait });
  const chart = layoutFamilyTree(enriched);
  const notableMembers = house.frontmatter["notable-members"] ?? [];

  return (
    <PlateLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <div className={styles.nameRow}>
            <h1>{house.frontmatter.name}</h1>
          </div>
          {house.frontmatter.words && (
            <p className={cx("subtitle", styles.words)}>
              &ldquo;{house.frontmatter.words}&rdquo;
            </p>
          )}
          <FiligreeRule variant="lozenge" className={styles.divider} />
        </div>
        <div className={styles.search}>
          <HouseSearchInput />
        </div>
        <HouseInfobox
          house={house.frontmatter}
          castlesBySlug={castlesBySlug}
          charactersBySlug={charactersBySlug}
          housesBySlug={housesBySlug}
          weaponsBySlug={weaponsBySlug}
          dragonsForHouse={dragonsForHouse}
          className={styles.infobox}
        />
        <div className={styles.main}>
          <article
            className={styles.body}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {notableMembers.length > 0 ? (
            <section
              className={styles.tree}
              aria-labelledby="notable-members-heading"
            >
              <h2 id="notable-members-heading">Notable Members</h2>
              <ul className={styles.notableList}>
                {notableMembers.map((member) => {
                  const character = member.slug
                    ? charactersBySlug.get(member.slug)
                    : undefined;
                  const isLinkable = !!character && !character.placeholder;
                  return (
                    <li key={member.slug ?? member.name}>
                      {isLinkable ? (
                        <Link
                          href={`/characters/${member.slug}/`}
                          className={styles.notableName}
                        >
                          {member.name}
                        </Link>
                      ) : (
                        <span className={styles.notableName}>
                          {member.name}
                        </span>
                      )}
                      {member.note && (
                        <span className={styles.notableNote}>
                          {" "}
                          {member.note}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <section
              className={styles.tree}
              aria-labelledby="family-tree-heading"
            >
              <FamilyTreeViews
                headingId="family-tree-heading"
                roots={tree}
                chart={chart}
              />
            </section>
          )}

          <p className={styles.back}>
            <Link href="/houses/">← All Houses</Link>
          </p>

          <Sources sources={house.frontmatter.sources} />
        </div>
      </div>
    </PlateLayout>
  );
}
