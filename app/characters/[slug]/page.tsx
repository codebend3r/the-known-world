import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadAllCharacters,
  loadAllHouses,
  loadCharacter,
  renderMarkdown,
} from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sigil } from '@/components/Sigil';
import { Sources } from '@/components/Sources';
import type { Character } from '@/lib/schemas';

export async function generateStaticParams() {
  const characters = await loadAllCharacters();
  return characters
    .filter((c) => !c.frontmatter.draft && !c.frontmatter.placeholder)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) return { title: 'Not found' };
  return {
    title: `${character.frontmatter.name} · Atlas of the Known World`,
  };
}

function formatDate(d: Character['born']): string {
  if (!d) return '—';
  const { year, era, precision } = d;
  if (era === 'AC' || era === 'BC') {
    return `${Math.abs(year)} ${era}`;
  }
  const eraLabel = era
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  return precision === 'legendary' ? `${eraLabel} (legendary)` : eraLabel;
}

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, '');
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
    <div>
      <dt>{label}</dt>
      <dd>
        {refs.map((r, i) => (
          <span key={r.slug}>
            {i > 0 && ', '}
            {r.linkable ? (
              <Link href={`/characters/${r.slug}/`}>{r.name}</Link>
            ) : (
              <span className="character-detail__placeholder">{r.name}</span>
            )}
          </span>
        ))}
      </dd>
    </div>
  );
}

export default async function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) notFound();

  const fm = character.frontmatter;

  const [allCharacters, allHouses] = await Promise.all([
    loadAllCharacters(),
    loadAllHouses(),
  ]);

  const charactersBySlug = new Map(allCharacters.map((c) => [c.slug, c.frontmatter]));
  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));

  const primaryHouse = housesBySlug.get(fm['primary-house']);
  const alsoHouses = fm['also-of-houses']
    .map((s) => ({ slug: s, house: housesBySlug.get(s) }))
    .filter((x): x is { slug: string; house: NonNullable<typeof x.house> } => x.house !== undefined);

  const parents = resolveRelations(fm.parents, charactersBySlug);
  const spouses = resolveRelations(fm.spouses, charactersBySlug);
  const children = resolveRelations(fm.children, charactersBySlug);
  const hasFamily = parents.length + spouses.length + children.length > 0;

  const html = character.body.trim() ? await renderMarkdown(character.body) : '';
  const headlineTitle = fm.titles.length > 0 ? fm.titles[fm.titles.length - 1] : null;

  return (
    <ParchmentLayout>
      <div className="character-detail__crest">
        <Sigil
          slug={fm['primary-house']}
          name={primaryHouse ? shortHouseName(primaryHouse.name) : fm.name}
          size="9rem"
          decorative
        />
      </div>
      <h1>{fm.name}</h1>
      {headlineTitle && <p className="subtitle">{headlineTitle}</p>}

      <dl className="character-detail__meta">
        <div>
          <dt>Born</dt>
          <dd>{formatDate(fm.born)}</dd>
        </div>
        {fm.died && (
          <div>
            <dt>Died</dt>
            <dd>{formatDate(fm.died)}</dd>
          </div>
        )}
        <div>
          <dt>House</dt>
          <dd>
            {primaryHouse ? (
              <Link href={`/houses/${fm['primary-house']}/`}>
                {primaryHouse.name}
              </Link>
            ) : (
              fm['primary-house']
            )}
          </dd>
        </div>
        {alsoHouses.length > 0 && (
          <div>
            <dt>Also of</dt>
            <dd>
              {alsoHouses.map(({ slug: s, house }, i) => (
                <span key={s}>
                  {i > 0 && ', '}
                  <Link href={`/houses/${s}/`}>{house.name}</Link>
                </span>
              ))}
            </dd>
          </div>
        )}
        {fm.titles.length > 0 && (
          <div className="character-detail__meta-wide">
            <dt>Titles</dt>
            <dd>
              <ul className="character-detail__titles">
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
          className="character-detail__body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {hasFamily && (
        <section className="character-detail__family" aria-labelledby="family-heading">
          <h2 id="family-heading">Family</h2>
          <dl className="character-detail__relations">
            <RelationRow label="Parents" refs={parents} />
            <RelationRow label="Spouses" refs={spouses} />
            <RelationRow label="Children" refs={children} />
          </dl>
        </section>
      )}

      <p className="character-detail__back">
        <Link href="/characters/">← All Characters</Link>
      </p>

      <Sources sources={fm.sources} />
    </ParchmentLayout>
  );
}
