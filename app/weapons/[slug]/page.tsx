import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  loadWeapon,
  loadAllWeapons,
  loadAllDragons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from "@/lib/content";
import { findWeaponImage } from "@/lib/weapon-image";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import { WeaponInfobox } from "@/components/WeaponInfobox";
import { bySlug } from "@/lib/collections";
import styles from "@/app/weapons/[slug]/page.module.scss";

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
  if (!weapon) return { title: "Not found" };
  return {
    title: `${weapon.frontmatter.name} · Atlas of the Known World`,
  };
}

const TYPE_NOUN: Record<string, string> = {
  sword: "sword",
  greatsword: "greatsword",
  longsword: "longsword",
  dagger: "dagger",
  axe: "axe",
  spear: "spear",
  bow: "bow",
  horn: "horn",
  other: "arm",
};

const MATERIAL_ADJ: Record<string, string> = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "",
};

export default async function WeaponPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [weapon, allHouses, allCharacters, allWeapons, allDragons, image] =
    await Promise.all([
      loadWeapon(slug).catch(() => null),
      loadAllHouses(),
      loadAllCharacters(),
      loadAllWeapons(),
      loadAllDragons(),
      findWeaponImage(slug),
    ]);
  if (!weapon) notFound();

  const housesBySlug = bySlug(allHouses);
  const charactersBySlug = bySlug(allCharacters);

  const fm = weapon.frontmatter;
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
    current: { kind: "weapon", slug, mentions: weapon.frontmatter.mentions },
  });
  const html =
    fm && weapon.body.trim()
      ? await renderMarkdown(weapon.body, { proseLinks })
      : "";
  const originHouse = fm["origin-house"]
    ? housesBySlug.get(fm["origin-house"])
    : undefined;

  const subtitleParts = [MATERIAL_ADJ[fm.material], TYPE_NOUN[fm.type]].filter(
    Boolean,
  );
  const subtitle = [
    subtitleParts.join(" "),
    originHouse ? `of ${originHouse.name}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <PlateLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {image && (
          <figure className={styles.figure}>
            <Image
              src={image}
              alt={fm.name}
              width={1280}
              height={720}
              sizes="(max-width: 767.98px) 100vw, 1240px"
              priority
            />
          </figure>
        )}
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
    </PlateLayout>
  );
}
