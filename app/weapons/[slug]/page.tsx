import Image from "next/image";
import {
  loadWeapon,
  loadAllWeapons,
  loadAllHouses,
  loadAllCharacters,
  renderEntryBody,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { findWeaponImage } from "@/lib/weapon-image";
import type { Weapon } from "@/lib/schemas";
import { EntryPlate } from "@/components/EntryPlate";
import { WeaponInfobox } from "@/components/WeaponInfobox";
import { bySlug } from "@/lib/collections";
import { cx } from "@/lib/cx";
import styles from "@/app/weapons/[slug]/page.module.scss";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllWeapons });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadWeapon,
    metadata: (weapon) => ({
      title: `${weapon.frontmatter.name} · Atlas of the Known World`,
    }),
  });
}

const TYPE_NOUN = {
  sword: "sword",
  greatsword: "greatsword",
  longsword: "longsword",
  dagger: "dagger",
  axe: "axe",
  spear: "spear",
  bow: "bow",
  horn: "horn",
  other: "arm",
} as const satisfies Record<Weapon["type"], string>;

const MATERIAL_ADJ = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "",
} as const satisfies Record<Weapon["material"], string>;

export default async function WeaponPage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const [weapon, allHouses, allCharacters, image] = await Promise.all([
    loadEntryOr404({ load: loadWeapon, slug }),
    loadAllHouses(),
    loadAllCharacters(),
    findWeaponImage(slug),
  ]);

  const housesBySlug = bySlug(allHouses);
  const charactersBySlug = bySlug(allCharacters);

  const fm = weapon.frontmatter;
  const html = await renderEntryBody({
    body: weapon.body,
    current: { kind: "weapon", slug, mentions: fm.mentions },
  });
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
    <EntryPlate
      layout="banner"
      title={fm.name}
      // An empty string drops the subtitle line entirely on this page.
      subtitle={subtitle || undefined}
      html={html}
      back={{ href: "/weapons/", label: "All Weapons" }}
      sources={fm.sources}
      banner={({ className }) =>
        image && (
          <figure className={cx(className, styles.figure)}>
            <Image
              src={image}
              alt={`Depiction of ${fm.name}`}
              width={1280}
              height={720}
              sizes="(max-width: 767.98px) 100vw, 1240px"
              priority
            />
          </figure>
        )
      }
      infobox={({ className }) => (
        <WeaponInfobox
          weapon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={className}
        />
      )}
    />
  );
}
