import { cx } from "@/lib/cx";
import { InfoRow } from "@/components/Infobox";
import { houseLabel, humanizeSlug, titleCase } from "@/lib/text";
import { formatBattleWhen } from "@/lib/battle-date";
import type { Battle, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox/HouseInfobox.module.scss";
import styles from "@/components/Infobox/Infobox.module.scss";

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
        {battle.participants.map((p) => (
          <InfoRow
            key={p.side}
            label={titleCase(p.side)}
            entries={p.houses.map((slug) => ({
              slug,
              name: houseLabel({ slug, housesBySlug }),
            }))}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ))}
        {battle.victor && (
          <div className={styles.row}>
            <dt>Victor</dt>
            <dd>{titleCase(battle.victor)}</dd>
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
