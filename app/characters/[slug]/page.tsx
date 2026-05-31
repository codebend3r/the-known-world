import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadAllCharacters,
  loadAllHouses,
  loadAllWeapons,
  loadAllDragons,
  loadCharacter,
  renderMarkdown,
} from "@/lib/content";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { ageAtDeath } from "@/lib/age";
import { findPortrait } from "@/lib/portraits";
import { cdnImage } from "@/lib/cdn-image";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { Sigil } from "@/components/Sigil";
import { Sources } from "@/components/Sources";
import type { Character } from "@/lib/schemas";
import styles from "@/app/characters/[slug]/page.module.scss";

export async function generateStaticParams() {
  const characters = await loadAllCharacters();
  return characters
    .filter((c) => !c.frontmatter.draft && !c.frontmatter.placeholder)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) return { title: "Not found" };
  return {
    title: `${character.frontmatter.name} · Atlas of the Known World`,
  };
}

function formatDate(d: Character["born"]): string {
  if (!d) return "—";
  const { year, era, precision } = d;
  if (era === "AC" || era === "BC") {
    return `${Math.abs(year)} ${era}`;
  }
  const eraLabel = era
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return precision === "legendary" ? `${eraLabel} (legendary)` : eraLabel;
}

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

type RelationRef = {
  slug: string;
  name: string;
  linkable: boolean;
};

function resolveRelations(
  slugs: readonly string[],
  charactersBySlug: Map<string, Character>,
): RelationRef[] {
  return slugs.map((slug) => {
    const character = charactersBySlug.get(slug);
    if (!character) {
      return { slug, name: slug, linkable: false };
    }
    return {
      slug,
      name: character.name,
      linkable: !character.placeholder,
    };
  });
}

function RelationRow({ label, refs }: { label: string; refs: RelationRef[] }) {
  if (refs.length === 0) return null;
  return (
    <div className={styles.relationsRow}>
      <dt>{label}</dt>
      <dd>
        {refs.map((r, i) => (
          <span key={r.slug}>
            {i > 0 && ", "}
            {r.linkable ? (
              <Link href={`/characters/${r.slug}/`}>{r.name}</Link>
            ) : (
              <span className={styles.placeholder}>{r.name}</span>
            )}
          </span>
        ))}
      </dd>
    </div>
  );
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) notFound();

  const fm = character.frontmatter;

  const [allCharacters, allHouses, allWeapons, allDragons, portrait] =
    await Promise.all([
      loadAllCharacters(),
      loadAllHouses(),
      loadAllWeapons(),
      loadAllDragons(),
      findPortrait(slug, fm.sex),
    ]);

  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );
  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));

  const primaryHouse = fm["primary-house"]
    ? housesBySlug.get(fm["primary-house"])
    : undefined;
  const alsoHouses = fm["also-of-houses"]
    .map((s) => ({ slug: s, house: housesBySlug.get(s) }))
    .filter(
      (x): x is { slug: string; house: NonNullable<typeof x.house> } =>
        x.house !== undefined,
    );

  const parents = resolveRelations(fm.parents, charactersBySlug);
  const spouses = resolveRelations(fm.spouses, charactersBySlug);
  const children = resolveRelations(fm.children, charactersBySlug);
  const hasFamily = parents.length + spouses.length + children.length > 0;

  const bornBy = allWeapons
    .map((w) => w.frontmatter)
    .filter((w) => !w.draft && w.wielders.includes(slug));

  const ridden = allDragons
    .map((d) => d.frontmatter)
    .filter((d) => !d.draft && d.riders.includes(slug));

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
    current: { kind: "character", slug, mentions: fm.mentions },
  });
  const html = character.body.trim()
    ? await renderMarkdown(character.body, { proseLinks })
    : "";

  return (
    <ParchmentLayout>
      <div className={styles.portrait}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cdnImage(portrait, { w: 1200, fm: "webp", q: 80 })}
          alt={`Portrait of ${fm.name}`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className={styles.heading}>
        <Sigil
          slug={fm["primary-house"]}
          name={primaryHouse ? shortHouseName(primaryHouse.name) : fm.name}
          region={regionForHouse(fm["primary-house"], housesBySlug)}
          size="6rem"
          decorative
        />
        <h1>
          {fm.name}
          {fm.aliases.length > 0 && (
            <span className={styles.alias}> ({fm.aliases[0]})</span>
          )}
        </h1>
      </div>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Born</dt>
          <dd>{formatDate(fm.born)}</dd>
        </div>
        {fm.died && (
          <div className={styles.metaRow}>
            <dt>Died</dt>
            <dd>
              {formatDate(fm.died)}
              {(() => {
                const age = ageAtDeath(fm.born, fm.died);
                return age !== null ? ` (aged ${age})` : null;
              })()}
            </dd>
          </div>
        )}
        <div className={styles.metaRow}>
          <dt>House</dt>
          <dd>
            {primaryHouse ? (
              <Link href={`/houses/${fm["primary-house"]}/`}>
                {primaryHouse.name}
              </Link>
            ) : fm["primary-house"] !== null ? (
              fm["primary-house"]
            ) : (
              <span className={styles.unaffiliated}>Unaffiliated</span>
            )}
          </dd>
        </div>
        {alsoHouses.length > 0 && (
          <div className={styles.metaRow}>
            <dt>Also of</dt>
            <dd>
              {alsoHouses.map(({ slug: s, house }, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <Link href={`/houses/${s}/`}>{house.name}</Link>
                </span>
              ))}
            </dd>
          </div>
        )}
        {fm.titles.length > 0 && (
          <div className={cx(styles.metaRow, styles.metaRowWide)}>
            <dt>Titles</dt>
            <dd>
              <ul className={styles.titles}>
                {fm.titles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {html && (
        <article
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {hasFamily && (
        <section aria-labelledby="family-heading">
          <h2 id="family-heading">Family</h2>
          <dl className={styles.relations}>
            <RelationRow label="Parents" refs={parents} />
            <RelationRow label="Spouses" refs={spouses} />
            <RelationRow label="Children" refs={children} />
          </dl>
        </section>
      )}

      {bornBy.length > 0 && (
        <section aria-labelledby="bore-heading">
          <h2 id="bore-heading">Bore</h2>
          <ul className={styles.crossList}>
            {bornBy.map((w) => (
              <li key={w.slug}>
                <Link href={`/weapons/${w.slug}/`}>{w.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ridden.length > 0 && (
        <section aria-labelledby="rode-heading">
          <h2 id="rode-heading">Rode</h2>
          <ul className={styles.crossList}>
            {ridden.map((d) => (
              <li key={d.slug}>
                <Link href={`/dragons/${d.slug}/`}>{d.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.back}>
        <Link href="/characters/">← All Characters</Link>
      </p>

      <Sources sources={fm.sources} />
    </ParchmentLayout>
  );
}
