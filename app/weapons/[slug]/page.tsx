import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadWeapon,
  loadAllWeapons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';
import { WeaponInfobox } from '@/components/WeaponInfobox';
import styles from '@/app/weapons/[slug]/page.module.css';

export async function generateStaticParams() {
  const weapons = await loadAllWeapons();
  return weapons
    .filter((w) => !w.frontmatter.draft)
    .map((w) => ({ slug: w.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const weapon = await loadWeapon(slug).catch(() => null);
  if (!weapon) return { title: 'Not found' };
  return {
    title: `${weapon.frontmatter.name} · Atlas of the Known World`,
  };
}

const TYPE_NOUN: Record<string, string> = {
  sword: 'sword',
  greatsword: 'greatsword',
  longsword: 'longsword',
  dagger: 'dagger',
  axe: 'axe',
  spear: 'spear',
  bow: 'bow',
  horn: 'horn',
  other: 'arm',
};

const MATERIAL_ADJ: Record<string, string> = {
  'valyrian-steel': 'Valyrian steel',
  dragonglass: 'Dragonglass',
  dragonbone: 'Dragonbone',
  steel: 'Steel',
  other: '',
};

export default async function WeaponPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [weapon, allHouses, allCharacters] = await Promise.all([
    loadWeapon(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
  ]);
  if (!weapon) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );

  const fm = weapon.frontmatter;
  const html = fm && weapon.body.trim() ? await renderMarkdown(weapon.body) : '';
  const originHouse = fm['origin-house']
    ? housesBySlug.get(fm['origin-house'])
    : undefined;

  const subtitleParts = [MATERIAL_ADJ[fm.material], TYPE_NOUN[fm.type]].filter(Boolean);
  const subtitle = [
    subtitleParts.join(' '),
    originHouse ? `of ${originHouse.name}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <WeaponInfobox
          weapon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={styles.infobox}
        />
        <div className={styles.main}>
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/weapons/">← All Weapons</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </ParchmentLayout>
  );
}
