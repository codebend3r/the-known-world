import Link from "next/link";
import { InfoRow } from "@/components/Infobox";
import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { humanizeSlug, shortHouseName, titleCase } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { regionForHouse } from "@/lib/regions";
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
  const seats: HouseInfoEntry[] = house.seats ?? [
    {
      slug: house.seat,
      name: castlesBySlug.get(house.seat)?.name ?? humanizeSlug(house.seat),
    },
  ];

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
    name: housesBySlug.get(slug)?.name ?? `House ${humanizeSlug(slug)}`,
  }));

  const liegeHouse = house.liege ? housesBySlug.get(house.liege) : null;

  return (
    <aside
      className={cx(styles.infobox, className)}
      aria-label={`${house.name} infobox`}
    >
      <div className={styles.sigil}>
        <Sigil
          slug={house.slug}
          name={shortHouseName(house.name)}
          region={regionForHouse(house.slug, housesBySlug)}
          sizes="(max-width: 768px) 90vw, 400px"
          decorative
          priority
          className={styles.sigilFill}
        />
      </div>

      <dl className={styles.rows}>
        {house.sigil.description && (
          <div className={infoboxStyles.row}>
            <dt>Coat of arms</dt>
            <dd>{house.sigil.description}</dd>
          </div>
        )}

        <div className={infoboxStyles.row}>
          <dt>Provenance</dt>
          <dd>{titleCase(house.sigil.provenance)}</dd>
        </div>

        <div className={infoboxStyles.row}>
          <dt>Rank</dt>
          <dd>{titleCase(house.rank)}</dd>
        </div>

        <InfoRow
          label="Seats"
          entries={seats}
          hrefPrefix="/castles"
          exists={(s) => castlesBySlug.has(s)}
        />

        <InfoRow
          label="Heads"
          entries={heads}
          hrefPrefix="/characters"
          exists={(s) => {
            const c = charactersBySlug.get(s);
            return !!c && !c.placeholder;
          }}
        />

        <InfoRow label="Regions" entries={regions} />

        <InfoRow label="Titles" entries={titles} />

        <div className={infoboxStyles.row}>
          <dt>Overlord</dt>
          <dd>
            {liegeHouse ? (
              <Link href={`/houses/${liegeHouse.slug}/`}>
                {liegeHouse.name}
              </Link>
            ) : house.liege ? (
              <span>{house.liege}</span>
            ) : (
              <span>None; sovereign</span>
            )}
          </dd>
        </div>

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

        <div className={infoboxStyles.row}>
          <dt>Founded</dt>
          <dd>{formatEraDate(house.founded)}</dd>
        </div>

        {house.extinct && (
          <div className={infoboxStyles.row}>
            <dt>Extinct</dt>
            <dd>{formatEraDate(house.extinct)}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
