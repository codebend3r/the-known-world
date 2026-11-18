import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { houseLabel, shortHouseName } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { CharacterInfoRow, InfoField, InfoRow } from "@/components/Infobox";
import type { Dragon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/Infobox/Infobox.module.scss";

type Props = {
  dragon: Dragon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

const STATUS_LABEL = {
  extant: "Extant",
  dead: "Dead",
  lost: "Lost",
  wild: "Wild",
} as const satisfies Record<Dragon["status"], string>;

const SIZE_LABEL = {
  hatchling: "Hatchling",
  young: "Young",
  mature: "Mature",
  great: "Great",
  monstrous: "Monstrous",
} as const satisfies Record<NonNullable<Dragon["size"]>, string>;

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
          name: houseLabel({ slug: dragon.house, housesBySlug }),
        },
      ]
    : [];

  const aliases: HouseInfoEntry[] = dragon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${dragon.name} infobox`}
    >
      <p className={infoboxStyles.caption}>{dragon.name}</p>
      {house && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={house.slug}
            name={shortHouseName(house.name)}
            region={regionForHouse({ slug: house.slug, housesBySlug })}
            sizes="(max-width: 768px) 90vw, 400px"
            isDecorative
            priority
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        <InfoField label="Color">{dragon.color}</InfoField>
        <InfoField label="Size">
          {dragon.size ? SIZE_LABEL[dragon.size] : null}
        </InfoField>
        <InfoField label="Hatched">
          {dragon.hatched ? formatEraDate(dragon.hatched) : null}
        </InfoField>
        <InfoField label="Died">
          {dragon.died ? formatEraDate(dragon.died) : null}
        </InfoField>
        <InfoField label="Status">{STATUS_LABEL[dragon.status]}</InfoField>
        {dragon.house ? (
          <InfoRow
            label="House"
            entries={houseEntries}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ) : (
          <InfoField label="House">Wild</InfoField>
        )}
        <CharacterInfoRow
          label={dragon.riders.length === 1 ? "Rider" : "Riders"}
          slugs={dragon.riders}
          charactersBySlug={charactersBySlug}
        />
        <InfoRow label="Aliases" entries={aliases} />
      </dl>
    </aside>
  );
}
