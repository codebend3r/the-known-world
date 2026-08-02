import type { CSSProperties } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { InfoRow } from "@/components/Infobox";
import { houseLabel, humanizeSlug, titleCase } from "@/lib/text";
import { formatBattleWhen } from "@/lib/battle-date";
import { regionForHouse } from "@/lib/regions";
import type { Battle, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox/HouseInfobox.module.scss";
import styles from "@/components/Infobox/Infobox.module.scss";
import battleStyles from "@/components/BattleInfobox/BattleInfobox.module.scss";

type Props = {
  battle: Battle;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

const TYPE_LABEL: Record<Battle["type"], string> = {
  battle: "Battle",
  siege: "Siege",
  war: "War",
  campaign: "Campaign",
  raid: "Raid",
  naval: "Naval battle",
  massacre: "Massacre",
  rebellion: "Rebellion",
  mutiny: "Mutiny",
  skirmish: "Skirmish",
  other: "Other",
};

export function BattleInfobox({
  battle,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const commanders: HouseInfoEntry[] = battle.commanders.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const casualties: HouseInfoEntry[] = battle.casualties.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const aliases: HouseInfoEntry[] = battle.aliases.map((a) => ({ name: a }));

  const characterExists = (s: string) => {
    const c = charactersBySlug.get(s);
    return !!c && !c.placeholder;
  };

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${battle.name} infobox`}
    >
      <p className={infoboxStyles.caption}>{battle.name}</p>
      <dl className={infoboxStyles.rows}>
        <div className={styles.row}>
          <dt>Type</dt>
          <dd>{TYPE_LABEL[battle.type]}</dd>
        </div>
        {battle.war && (
          <div className={styles.row}>
            <dt>Conflict</dt>
            <dd>{battle.war}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>When</dt>
          <dd>{formatBattleWhen(battle.start, battle.end)}</dd>
        </div>
        {battle.location && (
          <div className={styles.row}>
            <dt>Location</dt>
            <dd>{titleCase(battle.location)}</dd>
          </div>
        )}
        {/* Belligerents carry a shield swatch per side so the order of battle
            reads heraldically before it reads as text. */}
        {battle.participants.map((p) => (
          <div key={p.side} className={styles.row}>
            <dt>{titleCase(p.side)}</dt>
            <dd>
              <ul className={battleStyles.belligerents}>
                {p.houses.map((slug) => {
                  const region = regionForHouse(slug, housesBySlug);
                  const tint: CSSProperties = region
                    ? { "--house-tint": `var(--region-color-${region})` }
                    : {};
                  const name = houseLabel({ slug, housesBySlug });
                  return (
                    <li key={slug} className={battleStyles.belligerent}>
                      <span
                        className={battleStyles.swatch}
                        style={tint}
                        aria-hidden="true"
                      />
                      {housesBySlug.has(slug) ? (
                        <Link href={`/houses/${slug}/`}>{name}</Link>
                      ) : (
                        <span>{name}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
        {battle.victor && (
          <div className={styles.row}>
            <dt>Victor</dt>
            <dd>
              <span className={battleStyles.victor}>
                {titleCase(battle.victor)}
              </span>
            </dd>
          </div>
        )}
        <InfoRow
          label={commanders.length === 1 ? "Commander" : "Commanders"}
          entries={commanders}
          hrefPrefix="/characters"
          exists={characterExists}
        />
        <InfoRow
          label="Fallen"
          entries={casualties}
          hrefPrefix="/characters"
          exists={characterExists}
        />
        <InfoRow label="Also called" entries={aliases} />
        {battle.outcome && (
          <div className={styles.row}>
            <dt>Outcome</dt>
            <dd>{battle.outcome}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
