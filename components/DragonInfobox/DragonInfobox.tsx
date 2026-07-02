import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { humanizeSlug, shortHouseName } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { InfoRow } from "@/components/Infobox";
import type { Dragon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox/HouseInfobox.module.scss";
import sharedStyles from "@/components/Infobox/Infobox.module.scss";

type Props = {
  dragon: Dragon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

const STATUS_LABEL: Record<Dragon["status"], string> = {
  extant: "Extant",
  dead: "Dead",
  lost: "Lost",
  wild: "Wild",
};

const SIZE_LABEL: Record<NonNullable<Dragon["size"]>, string> = {
  hatchling: "Hatchling",
  young: "Young",
  mature: "Mature",
  great: "Great",
  monstrous: "Monstrous",
};

export function DragonInfobox({
  dragon,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const house = dragon.house ? housesBySlug.get(dragon.house) : undefined;

  const houseEntries: HouseInfoEntry[] = dragon.house
    ? [
        {
          slug: dragon.house,
          name: house?.name ?? `House ${humanizeSlug(dragon.house)}`,
        },
      ]
    : [];

  const riders: HouseInfoEntry[] = dragon.riders.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const aliases: HouseInfoEntry[] = dragon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${dragon.name} infobox`}
    >
      {house && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={house.slug}
            name={shortHouseName(house.name)}
            region={regionForHouse(house.slug, housesBySlug)}
            sizes="(max-width: 768px) 90vw, 400px"
            decorative
            priority
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        {dragon.color && (
          <div className={sharedStyles.row}>
            <dt>Color</dt>
            <dd>{dragon.color}</dd>
          </div>
        )}
        {dragon.size && (
          <div className={sharedStyles.row}>
            <dt>Size</dt>
            <dd>{SIZE_LABEL[dragon.size]}</dd>
          </div>
        )}
        {dragon.hatched && (
          <div className={sharedStyles.row}>
            <dt>Hatched</dt>
            <dd>{formatEraDate(dragon.hatched)}</dd>
          </div>
        )}
        {dragon.died && (
          <div className={sharedStyles.row}>
            <dt>Died</dt>
            <dd>{formatEraDate(dragon.died)}</dd>
          </div>
        )}
        <div className={sharedStyles.row}>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[dragon.status]}</dd>
        </div>
        {dragon.house ? (
          <InfoRow
            label="House"
            entries={houseEntries}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ) : (
          <div className={sharedStyles.row}>
            <dt>House</dt>
            <dd>Wild</dd>
          </div>
        )}
        <InfoRow
          label={riders.length === 1 ? "Rider" : "Riders"}
          entries={riders}
          hrefPrefix="/characters"
          exists={(s) => {
            const c = charactersBySlug.get(s);
            return !!c && !c.placeholder;
          }}
        />
        <InfoRow label="Aliases" entries={aliases} />
      </dl>
    </aside>
  );
}
