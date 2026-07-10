import { notFound } from "next/navigation";
import Image from "next/image";
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
import { cx } from "@/lib/cx";
import { shortHouseName } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { bySlug } from "@/lib/collections";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { CharacterSearchInput } from "@/components/CharacterSearchInput";
import { Sigil } from "@/components/Sigil";
import { Sources } from "@/components/Sources";
import { SIGIL_SLUGS } from "@/lib/sigil";
import { resolveRelations, type RelationRef } from "@/lib/character-relations";
import styles from "@/app/characters/[slug]/page.module.scss";

const REGION_PORTRAIT_CLASS: Record<string, string | undefined> = {
  north: styles.portraitNorth,
  vale: styles.portraitVale,
  riverlands: styles.portraitRiverlands,
  westerlands: styles.portraitWesterlands,
  reach: styles.portraitReach,
  stormlands: styles.portraitStormlands,
  dorne: styles.portraitDorne,
  "iron-islands": styles.portraitIronIslands,
  crownlands: styles.portraitCrownlands,
};

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

  const charactersBySlug = bySlug(allCharacters);
  const housesBySlug = bySlug(allHouses);

  const characterSuggestions = allCharacters
    .map((c) => c.frontmatter)
    .filter((f) => !f.draft && !f.placeholder)
    .map((f) => ({ slug: f.slug, name: f.name, alias: f.aliases[0] ?? null }));

  const primaryHouse = fm["primary-house"]
    ? housesBySlug.get(fm["primary-house"])
    : undefined;
  const region = regionForHouse(fm["primary-house"], housesBySlug);
  const alsoHouses = fm["also-of-houses"]
    .map((s) => ({ slug: s, house: housesBySlug.get(s) }))
    .filter(
      (x): x is { slug: string; house: NonNullable<typeof x.house> } =>
        x.house !== undefined,
    );

  const parents = resolveRelations({ slugs: fm.parents, charactersBySlug });
  const spouses = resolveRelations({ slugs: fm.spouses, charactersBySlug });
  const children = resolveRelations({ slugs: fm.children, charactersBySlug });
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
      <div
        className={cx(
          styles.portrait,
          region ? REGION_PORTRAIT_CLASS[region] : undefined,
        )}
      >
        <Image
          src={portrait}
          alt={`Portrait of ${fm.name}`}
          width={1200}
          height={1600}
          sizes="(max-width: 768px) 100vw, 1100px"
          priority
        />
      </div>
      <div className={styles.heading}>
        {primaryHouse && fm["primary-house"] ? (
          <Link
            href={`/houses/${fm["primary-house"]}/`}
            className={styles.sigilLink}
            aria-label={`House ${shortHouseName(primaryHouse.name)}`}
          >
            <Sigil
              slug={fm["primary-house"]}
              name={shortHouseName(primaryHouse.name)}
              region={region}
              size="6rem"
              decorative
            />
          </Link>
        ) : (
          <Sigil
            slug={SIGIL_SLUGS.has(slug) ? slug : null}
            name={fm.name}
            region={region}
            size="6rem"
            decorative
          />
        )}
        <h1>
          {fm.name}
          {fm.aliases.length > 0 && (
            <span className={styles.alias}> ({fm.aliases[0]})</span>
          )}
        </h1>
      </div>

      <div className={styles.search}>
        <CharacterSearchInput autocomplete items={characterSuggestions} />
      </div>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Born</dt>
          <dd>{formatEraDate(fm.born)}</dd>
        </div>
        {fm.died && (
          <div className={styles.metaRow}>
            <dt>Died</dt>
            <dd>
              {formatEraDate(fm.died)}
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
        {region && (
          <div className={styles.metaRow}>
            <dt>Region</dt>
            <dd>{regionLabel(region)}</dd>
          </div>
        )}
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
        <section
          className={styles.familySection}
          aria-labelledby="family-heading"
        >
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
