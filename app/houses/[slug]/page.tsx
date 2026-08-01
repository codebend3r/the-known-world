import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadHouse,
  loadAllHouses,
  loadAllCastles,
  loadAllCharacters,
  loadAllWeapons,
  loadAllDragons,
  renderMarkdown,
} from "@/lib/content";
import { PlateLayout } from "@/components/PlateLayout";
import { FiligreeRule } from "@/components/Filigree";
import { Sources } from "@/components/Sources";
import { FamilyTreeViews } from "@/components/FamilyTreeViews";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import { layoutFamilyTree } from "@/lib/family-tree-layout";
import { findPortrait } from "@/lib/portraits";
import { HouseInfobox } from "@/components/HouseInfobox";
import { buildFamilyTree } from "@/lib/family-tree";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { bySlug } from "@/lib/collections";
import styles from "@/app/houses/[slug]/page.module.scss";

export async function generateStaticParams() {
  const houses = await loadAllHouses();
  return houses
    .filter((h) => !h.frontmatter.draft)
    .map((h) => ({ slug: h.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const house = await loadHouse(slug).catch(() => null);
  if (!house) return { title: "Not found" };
  return {
    title: `${house.frontmatter.name} · Atlas of the Known World`,
    description: `The roll of ${house.frontmatter.name}, seat at ${house.frontmatter.seat}.`,
  };
}

export default async function HousePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [house, allHouses, castles, characters, allWeapons, allDragons] =
    await Promise.all([
      loadHouse(slug).catch(() => null),
      loadAllHouses(),
      loadAllCastles(),
      loadAllCharacters(),
      loadAllWeapons(),
      loadAllDragons(),
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
    current: { kind: "house", slug, mentions: house.frontmatter.mentions },
  });
  const html = await renderMarkdown(house.body, { proseLinks });
  const tree = buildFamilyTree(slug, characters);
  const enriched = await enrichTreeWithPortraits(tree, findPortrait);
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
            <p className="subtitle">&ldquo;{house.frontmatter.words}&rdquo;</p>
          )}
          <FiligreeRule className={styles.divider} />
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
                  const linkable = !!character && !character.placeholder;
                  return (
                    <li key={member.slug ?? member.name}>
                      {linkable ? (
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
