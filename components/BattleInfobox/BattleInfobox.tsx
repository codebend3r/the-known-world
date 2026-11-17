import Link from "next/link";
import { cx } from "@/lib/cx";
import { CharacterInfoRow, InfoField, InfoRow } from "@/components/Infobox";
import { houseLabel, titleCase } from "@/lib/text";
import { formatBattleWhen } from "@/lib/battle-date";
import { regionColorStyle, regionForHouse } from "@/lib/regions";
import type { Battle, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/Infobox/Infobox.module.scss";
import battleStyles from "@/components/BattleInfobox/BattleInfobox.module.scss";

type Props = {
  battle: Battle;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

const TYPE_LABEL = {
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
} as const satisfies Record<Battle["type"], string>;

export function BattleInfobox({
  battle,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const aliases: HouseInfoEntry[] = battle.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${battle.name} infobox`}
    >
      <p className={infoboxStyles.caption}>{battle.name}</p>
      <dl className={infoboxStyles.rows}>
        <InfoField label="Type">{TYPE_LABEL[battle.type]}</InfoField>
        <InfoField label="Conflict">{battle.war}</InfoField>
        <InfoField label="When">
          {formatBattleWhen({ start: battle.start, end: battle.end })}
        </InfoField>
        <InfoField label="Location">
          {battle.location ? titleCase(battle.location) : null}
        </InfoField>
        {/* Belligerents carry a shield swatch per side so the order of battle
            reads heraldically before it reads as text. */}
        {battle.participants.map((p) => (
          <InfoField key={p.side} label={titleCase(p.side)}>
            <ul className={battleStyles.belligerents}>
              {p.houses.map((slug) => {
                const name = houseLabel({ slug, housesBySlug });
                return (
                  <li key={slug} className={battleStyles.belligerent}>
                    <span
                      className={battleStyles.swatch}
                      style={regionColorStyle({
                        region: regionForHouse({ slug, housesBySlug }),
                        property: "--house-tint",
                      })}
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
          </InfoField>
        ))}
        <InfoField label="Victor">
          {battle.victor ? (
            <span className={battleStyles.victor}>
              {titleCase(battle.victor)}
            </span>
          ) : null}
        </InfoField>
        <CharacterInfoRow
          label={battle.commanders.length === 1 ? "Commander" : "Commanders"}
          slugs={battle.commanders}
          charactersBySlug={charactersBySlug}
        />
        <CharacterInfoRow
          label="Fallen"
          slugs={battle.casualties}
          charactersBySlug={charactersBySlug}
        />
        <InfoRow label="Also called" entries={aliases} />
        <InfoField label="Outcome">{battle.outcome}</InfoField>
      </dl>
    </aside>
  );
}
