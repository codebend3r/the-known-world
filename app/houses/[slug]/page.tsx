import Link from "next/link";
import {
  loadCastle,
  loadHouse,
  loadAllHouses,
  loadAllCastles,
  loadAllCharacters,
  loadAllWeapons,
  loadAllDragons,
  renderEntryBody,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { EntryBackLink } from "@/components/EntryPlate";
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
import { bySlug } from "@/lib/collections";
import { cx } from "@/lib/cx";
import styles from "@/app/houses/[slug]/page.module.scss";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllHouses });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadHouse,
    metadata: async (house) => {
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
    },
  });
}

export default async function HousePage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const [house, allHouses, castles, characters, allWeapons, allDragons] =
    await Promise.all([
      loadEntryOr404({ load: loadHouse, slug }),
      loadAllHouses(),
      loadAllCastles(),
      loadAllCharacters(),
      loadAllWeapons(),
      loadAllDragons(),
    ]);

  const housesBySlug = bySlug(allHouses);
  const castlesBySlug = bySlug(castles);
  const charactersBySlug = bySlug(characters);
  const weaponsBySlug = bySlug(allWeapons);
  const dragonsForHouse = allDragons
    .map((d) => d.frontmatter)
    .filter((d) => d.house === slug && !d.draft);

  const html = await renderEntryBody({
    body: house.body,
    current: { kind: "house", slug, mentions: house.frontmatter.mentions },
  });
  const tree = buildFamilyTree({ houseSlug: slug, people: characters });
  const enriched = await enrichTreeWithPortraits({ roots: tree, findPortrait });
  const chart = layoutFamilyTree(enriched);
  const notableMembers = house.frontmatter["notable-members"] ?? [];

  return (
    <PlateLayout>
      <div className={styles.detail}>
        <hgroup className={styles.heading}>
          <div className={styles.nameRow}>
            <h1>{house.frontmatter.name}</h1>
          </div>
          {house.frontmatter.words && (
            <p className={cx("subtitle", styles.words)}>
              &ldquo;{house.frontmatter.words}&rdquo;
            </p>
          )}
          <FiligreeRule variant="lozenge" className={styles.divider} />
        </hgroup>
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

          <EntryBackLink href="/houses/" label="All Houses" />

          <Sources sources={house.frontmatter.sources} />
        </div>
      </div>
    </PlateLayout>
  );
}
