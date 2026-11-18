import Link from "next/link";
import { CharacterInfoRow, InfoField, InfoRow } from "@/components/Infobox";
import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import {
  houseLabel,
  humanizeSlug,
  shortHouseName,
  titleCase,
} from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { regionColorStyle, regionForHouse } from "@/lib/regions";
import type {
  House,
  Castle,
  Character,
  HouseInfoEntry,
  Weapon,
  Dragon,
} from "@/lib/schemas";
import styles from "@/components/HouseInfobox/HouseInfobox.module.scss";
import infoboxStyles from "@/components/Infobox/Infobox.module.scss";

type Props = {
  house: House;
  castlesBySlug: Map<string, Castle>;
  charactersBySlug: Map<string, Character>;
  housesBySlug: Map<string, House>;
  weaponsBySlug: Map<string, Weapon>;
  dragonsForHouse: Dragon[];
  className?: string;
};

export function HouseInfobox({
  house,
  castlesBySlug,
  charactersBySlug,
  housesBySlug,
  weaponsBySlug,
  dragonsForHouse,
  className,
}: Props) {
  const seat = house.seat;
  const seats: HouseInfoEntry[] =
    house.seats ??
    (seat === null
      ? []
      : [
          {
            slug: seat,
            name: castlesBySlug.get(seat)?.name ?? humanizeSlug(seat),
          },
        ]);

  const heads = house.heads ?? [];
  const regions = house.regions ?? [];
  const titles = house.titles ?? [];
  const weapons: HouseInfoEntry[] = (house["ancestral-weapons"] ?? []).map(
    (slug) => ({
      slug,
      name: weaponsBySlug.get(slug)?.name ?? humanizeSlug(slug),
    }),
  );

  const dragons: HouseInfoEntry[] = dragonsForHouse.map((d) => ({
    slug: d.slug,
    name: d.name,
  }));

  const cadets: HouseInfoEntry[] = house["cadet-houses"].map((slug) => ({
    slug,
    name: houseLabel({ slug, housesBySlug }),
  }));

  const liegeHouse = house.liege ? housesBySlug.get(house.liege) : null;
  const region = regionForHouse({ slug: house.slug, housesBySlug });

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${house.name} infobox`}
    >
      {/* Heraldic colour as data: the banner takes the region's tint, the rest
          of the plate stays gold. An unknown region falls back inside the
          module. */}
      <div
        className={styles.banner}
        style={regionColorStyle({ region, property: "--house-tint" })}
      >
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={house.slug}
            name={shortHouseName(house.name)}
            region={region}
            sizes="(max-width: 768px) 90vw, 400px"
            isDecorative
            priority
            className={infoboxStyles.sigilFill}
          />
        </div>
      </div>
      <p className={infoboxStyles.caption}>{house.name}</p>

      <dl className={infoboxStyles.rows}>
        <InfoField label="Coat of arms">{house.sigil.description}</InfoField>

        <InfoField label="Provenance">
          {titleCase(house.sigil.provenance)}
        </InfoField>

        <InfoField label="Rank">{titleCase(house.rank)}</InfoField>

        <InfoRow
          label="Seats"
          entries={seats}
          hrefPrefix="/castles"
          exists={(s) => castlesBySlug.has(s)}
        />

        <CharacterInfoRow
          label="Heads"
          entries={heads}
          charactersBySlug={charactersBySlug}
        />

        <InfoRow label="Regions" entries={regions} />

        <InfoRow label="Titles" entries={titles} />

        <InfoField label="Overlord">
          {liegeHouse ? (
            <Link href={`/houses/${liegeHouse.slug}/`}>{liegeHouse.name}</Link>
          ) : house.liege ? (
            <span>{house.liege}</span>
          ) : (
            <span>None; sovereign</span>
          )}
        </InfoField>

        {cadets.length > 0 && (
          <InfoRow
            label={cadets.length === 1 ? "Cadet branch" : "Cadet branches"}
            entries={cadets}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        )}

        <InfoRow
          label="Ancestral weapons"
          entries={weapons}
          hrefPrefix="/weapons"
          exists={(s) => weaponsBySlug.has(s)}
        />

        <InfoRow
          label="Dragons"
          entries={dragons}
          hrefPrefix="/dragons"
          exists={(s) => dragonsForHouse.some((d) => d.slug === s)}
        />

        <InfoField label="Founded">{formatEraDate(house.founded)}</InfoField>

        <InfoField label="Extinct">
          {house.extinct ? formatEraDate(house.extinct) : null}
        </InfoField>
      </dl>
    </aside>
  );
}
