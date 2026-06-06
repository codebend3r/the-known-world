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
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { Sources } from "@/components/Sources";
import { FamilyTreeViews } from "@/components/FamilyTreeViews";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import { layoutFamilyTree } from "@/lib/family-tree-layout";
import { findPortrait } from "@/lib/portraits";
import { HouseInfobox } from "@/components/HouseInfobox";
import { buildFamilyTree } from "@/lib/family-tree";
import { buildProseLinkIndex } from "@/lib/prose-links";
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

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const castlesBySlug = new Map(castles.map((c) => [c.slug, c.frontmatter]));
  const charactersBySlug = new Map(
    characters.map((c) => [c.slug, c.frontmatter]),
  );
  const weaponsBySlug = new Map(allWeapons.map((w) => [w.slug, w.frontmatter]));
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
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{house.frontmatter.name}</h1>
          {house.frontmatter.words && (
            <p className="subtitle">&ldquo;{house.frontmatter.words}&rdquo;</p>
          )}
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
    </ParchmentLayout>
  );
}
