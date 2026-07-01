import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { InfoRow, humanizeSlug } from "@/components/Infobox";
import type { Weapon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox/HouseInfobox.module.scss";
import styles from "@/components/Infobox/Infobox.module.scss";

type Props = {
  weapon: Weapon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

const TYPE_LABEL: Record<Weapon["type"], string> = {
  sword: "Sword",
  greatsword: "Greatsword",
  longsword: "Longsword",
  dagger: "Dagger",
  axe: "Axe",
  spear: "Spear",
  bow: "Bow",
  horn: "Horn",
  other: "Other",
};

const MATERIAL_LABEL: Record<Weapon["material"], string> = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "Other",
};

const STATUS_LABEL: Record<Weapon["status"], string> = {
  extant: "Extant",
  lost: "Lost",
  destroyed: "Destroyed",
};

const CURRENT_HOUSE_FALLBACK: Record<Weapon["status"], string> = {
  extant: "—",
  lost: "Lost",
  destroyed: "Destroyed",
};

function formatDate(d: NonNullable<Weapon["forged"]>): string {
  const { year, era, precision } = d;
  if (era === "AC" || era === "BC") return `${Math.abs(year)} ${era}`;
  const label = era
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return precision === "legendary" ? `${label} (legendary)` : label;
}

function houseLabel(slug: string, housesBySlug: Map<string, House>): string {
  return housesBySlug.get(slug)?.name ?? `House ${humanizeSlug(slug)}`;
}

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
    ? [{ slug: origin, name: houseLabel(origin, housesBySlug) }]
    : [];

  const currentEntries: HouseInfoEntry[] = current
    ? [{ slug: current, name: houseLabel(current, housesBySlug) }]
    : [];

  const wielders: HouseInfoEntry[] = weapon.wielders.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const aliases: HouseInfoEntry[] = weapon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${weapon.name} infobox`}
    >
      {originHouse && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={originHouse.slug}
            name={shortHouseName(originHouse.name)}
            region={regionForHouse(originHouse.slug, housesBySlug)}
            sizes="(max-width: 768px) 90vw, 400px"
            decorative
            priority
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        <div className={styles.row}>
          <dt>Type</dt>
          <dd>{TYPE_LABEL[weapon.type]}</dd>
        </div>
        <div className={styles.row}>
          <dt>Material</dt>
          <dd>{MATERIAL_LABEL[weapon.material]}</dd>
        </div>
        {weapon.forged && (
          <div className={styles.row}>
            <dt>Forged</dt>
            <dd>{formatDate(weapon.forged)}</dd>
          </div>
        )}
        {weapon.destroyed && (
          <div className={styles.row}>
            <dt>Destroyed</dt>
            <dd>{formatDate(weapon.destroyed)}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[weapon.status]}</dd>
        </div>
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
          <div className={styles.row}>
            <dt>Current house</dt>
            <dd>{CURRENT_HOUSE_FALLBACK[weapon.status]}</dd>
          </div>
        )}
        <InfoRow
          label={wielders.length === 1 ? "Wielder" : "Wielders"}
          entries={wielders}
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
