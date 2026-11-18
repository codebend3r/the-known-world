import Link from "next/link";
import {
  loadAllCharacters,
  loadAllHouses,
  loadAllWeapons,
  loadAllDragons,
  loadCharacter,
  renderEntryBody,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { ageAtDeath } from "@/lib/age";
import { findPortraitVariants } from "@/lib/portrait-variants";
import { cx } from "@/lib/cx";
import { shortHouseName } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { bySlug } from "@/lib/collections";
import { regionForHouse, regionLabel, type RegionSlug } from "@/lib/regions";
import { PlateLayout } from "@/components/PlateLayout";
import { EntryBackLink } from "@/components/EntryPlate";
import { PortraitVariants } from "@/components/PortraitVariants";
import { CharacterSearchInput } from "@/components/CharacterSearchInput";
import { Sigil } from "@/components/Sigil";
import { Sources } from "@/components/Sources";
import { SIGIL_SLUGS } from "@/lib/sigil";
import { resolveRelations, type RelationRef } from "@/lib/character-relations";
import styles from "@/app/characters/[slug]/page.module.scss";

const REGION_PORTRAIT_CLASS = {
  north: styles.portraitNorth,
  vale: styles.portraitVale,
  riverlands: styles.portraitRiverlands,
  westerlands: styles.portraitWesterlands,
  reach: styles.portraitReach,
  stormlands: styles.portraitStormlands,
  dorne: styles.portraitDorne,
  "iron-islands": styles.portraitIronIslands,
  crownlands: styles.portraitCrownlands,
} as const satisfies Record<RegionSlug, string>;

export async function generateStaticParams() {
  return publishedSlugParams({
    loadAll: loadAllCharacters,
    isListed: (c) => !c.frontmatter.draft && !c.frontmatter.placeholder,
  });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadCharacter,
    metadata: (character) => ({
      title: `${character.frontmatter.name} · Atlas of the Known World`,
    }),
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
            {r.isLinkable ? (
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

function HouseValue({
  primary,
  houseSlug,
}: {
  primary: { slug: string; house: { name: string } } | null;
  houseSlug: string | null;
}) {
  if (primary) {
    return <Link href={`/houses/${primary.slug}/`}>{primary.house.name}</Link>;
  }
  if (houseSlug !== null) return houseSlug;
  return <span className={styles.unaffiliated}>Unaffiliated</span>;
}

export default async function CharacterPage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const character = await loadEntryOr404({ load: loadCharacter, slug });

  const fm = character.frontmatter;

  const [allCharacters, allHouses, allWeapons, allDragons, portraits] =
    await Promise.all([
      loadAllCharacters(),
      loadAllHouses(),
      loadAllWeapons(),
      loadAllDragons(),
      findPortraitVariants({ slug, name: fm.name, sex: fm.sex }),
    ]);

  const charactersBySlug = bySlug(allCharacters);
  const housesBySlug = bySlug(allHouses);

  const primaryHouseSlug = fm["primary-house"];
  const primaryHouse = primaryHouseSlug
    ? housesBySlug.get(primaryHouseSlug)
    : undefined;
  const primary =
    primaryHouseSlug && primaryHouse
      ? { slug: primaryHouseSlug, house: primaryHouse }
      : null;
  const region = regionForHouse({ slug: primaryHouseSlug, housesBySlug });
  const alsoHouses = fm["also-of-houses"].flatMap((s) => {
    const house = housesBySlug.get(s);
    return house ? [{ slug: s, house }] : [];
  });
  const deathAge = fm.died
    ? ageAtDeath({ born: fm.born, died: fm.died })
    : null;

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

  const html = await renderEntryBody({
    body: character.body,
    current: { kind: "character", slug, mentions: fm.mentions },
  });

  return (
    <PlateLayout>
      <div
        className={cx(
          styles.portrait,
          region ? REGION_PORTRAIT_CLASS[region] : undefined,
        )}
      >
        <PortraitVariants variants={portraits} name={fm.name} />
      </div>
      <header className={styles.heading}>
        {primary ? (
          <Link
            href={`/houses/${primary.slug}/`}
            className={styles.sigilLink}
            aria-label={`House ${shortHouseName(primary.house.name)}`}
          >
            <Sigil
              slug={primary.slug}
              name={shortHouseName(primary.house.name)}
              region={region}
              size="42px"
              hasPlate={false}
              isDecorative
            />
          </Link>
        ) : (
          <Sigil
            slug={SIGIL_SLUGS.has(slug) ? slug : null}
            name={fm.name}
            region={region}
            size="6rem"
            hasPlate={false}
            isDecorative
          />
        )}
        <hgroup className={styles.titleGroup}>
          <h1>{fm.name}</h1>
          {fm.aliases.length > 0 && (
            <p className={styles.alias}>{fm.aliases[0]}</p>
          )}
        </hgroup>
      </header>

      <div className={styles.search}>
        <CharacterSearchInput hasAutocomplete />
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
              {deathAge !== null && ` (aged ${deathAge})`}
            </dd>
          </div>
        )}
        <div className={styles.metaRow}>
          <dt>House</dt>
          <dd>
            <HouseValue primary={primary} houseSlug={primaryHouseSlug} />
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

      <EntryBackLink href="/characters/" label="All Characters" />

      <Sources sources={fm.sources} />
    </PlateLayout>
  );
}
