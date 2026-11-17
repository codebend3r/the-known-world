import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { houseLabel, shortHouseName } from "@/lib/text";
import { formatEraDate } from "@/lib/era-date";
import { CharacterInfoRow, InfoField, InfoRow } from "@/components/Infobox";
import type { Weapon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/Infobox/Infobox.module.scss";

type Props = {
  weapon: Weapon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

const TYPE_LABEL = {
  sword: "Sword",
  greatsword: "Greatsword",
  longsword: "Longsword",
  dagger: "Dagger",
  axe: "Axe",
  spear: "Spear",
  bow: "Bow",
  horn: "Horn",
  other: "Other",
} as const satisfies Record<Weapon["type"], string>;

const MATERIAL_LABEL = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "Other",
} as const satisfies Record<Weapon["material"], string>;

const STATUS_LABEL = {
  extant: "Extant",
  lost: "Lost",
  destroyed: "Destroyed",
} as const satisfies Record<Weapon["status"], string>;

const CURRENT_HOUSE_FALLBACK = {
  extant: "—",
  lost: "Lost",
  destroyed: "Destroyed",
} as const satisfies Record<Weapon["status"], string>;

export function WeaponInfobox({
  weapon,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const origin = weapon["origin-house"];
  const current = weapon["current-house"];
  const originHouse = origin ? housesBySlug.get(origin) : undefined;

  const originEntries: HouseInfoEntry[] = origin
    ? [{ slug: origin, name: houseLabel({ slug: origin, housesBySlug }) }]
    : [];

  const currentEntries: HouseInfoEntry[] = current
    ? [{ slug: current, name: houseLabel({ slug: current, housesBySlug }) }]
    : [];

  const aliases: HouseInfoEntry[] = weapon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${weapon.name} infobox`}
    >
      <p className={infoboxStyles.caption}>{weapon.name}</p>
      {originHouse && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={originHouse.slug}
            name={shortHouseName(originHouse.name)}
            region={regionForHouse({ slug: originHouse.slug, housesBySlug })}
            sizes="(max-width: 768px) 90vw, 400px"
            isDecorative
            priority
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        <InfoField label="Type">{TYPE_LABEL[weapon.type]}</InfoField>
        <InfoField label="Material">
          {MATERIAL_LABEL[weapon.material]}
        </InfoField>
        <InfoField label="Forged">
          {weapon.forged ? formatEraDate(weapon.forged) : null}
        </InfoField>
        <InfoField label="Destroyed">
          {weapon.destroyed ? formatEraDate(weapon.destroyed) : null}
        </InfoField>
        <InfoField label="Status">{STATUS_LABEL[weapon.status]}</InfoField>
        <InfoRow
          label="Origin house"
          entries={originEntries}
          hrefPrefix="/houses"
          exists={(s) => housesBySlug.has(s)}
        />
        {current ? (
          <InfoRow
            label="Current house"
            entries={currentEntries}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ) : (
          <InfoField label="Current house">
            {CURRENT_HOUSE_FALLBACK[weapon.status]}
          </InfoField>
        )}
        <CharacterInfoRow
          label={weapon.wielders.length === 1 ? "Wielder" : "Wielders"}
          slugs={weapon.wielders}
          charactersBySlug={charactersBySlug}
        />
        <InfoRow label="Aliases" entries={aliases} />
      </dl>
    </aside>
  );
}
