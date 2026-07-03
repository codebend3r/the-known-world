import type { Battle } from "@/lib/schemas";
import { absoluteYear, formatBattleWhen } from "@/lib/battle-date";

export type Landmass = "westeros" | "essos" | "summer-isles";

export const LANDMASSES = [
  "westeros",
  "essos",
  "summer-isles",
] as const satisfies readonly Landmass[];

export const LANDMASS_LABELS: Record<Landmass, string> = {
  westeros: "Westeros",
  essos: "Essos",
  "summer-isles": "Summer Isles",
};

export const PX_PER_YEAR = 2;
export const CLUSTER_GAP_PX = 28;

const TOP_PAD_PX = 48;
const BOTTOM_PAD_PX = 72;

/** Battles whose frontmatter carries no Westerosi `region`, placed by hand. */
const ESSOS_SLUGS = new Set([
  "century-of-blood",
  "ghiscari-wars",
  "rhoynish-wars",
  "sack-of-astapor",
  "taking-of-yunkai",
  "sack-of-meereen",
  "battle-of-meereen",
  "war-of-the-ninepenny-kings",
]);

const ERA_BANDS = [
  { label: "The Dawn Age", from: -12000, to: -10000 },
  { label: "The Age of Heroes", from: -10000, to: -8000 },
  { label: "The Long Night", from: -8000, to: -7700 },
  { label: "The Andal Invasion", from: -6000, to: -2000 },
] as const;

export type TimelineEvent = {
  slug: string;
  name: string;
  href: string;
  year: number;
  when: string;
};

export type TimelineNode =
  | { kind: "single"; y: number; event: TimelineEvent }
  | {
      kind: "cluster";
      y: number;
      label: string;
      when: string;
      events: TimelineEvent[];
    };

export type TimelineTick = { y: number; label: string };
export type TimelineEra = { label: string; top: number; height: number };

export type TimelineModel = {
  height: number;
  ticks: TimelineTick[];
  eras: TimelineEra[];
  columns: Record<Landmass, TimelineNode[]>;
};

export function landmassForBattle({ battle }: { battle: Battle }): Landmass {
  if (!!battle.region) return "westeros";
  return ESSOS_SLUGS.has(battle.slug) ? "essos" : "westeros";
}

function yearLabel(year: number): string {
  return year < 0 ? `${-year} BC` : `${year} AC`;
}

function yearSpanLabel({ from, to }: { from: number; to: number }): string {
  if (from === to) return yearLabel(from);
  const sameEra = from < 0 === to < 0;
  if (sameEra)
    return `${Math.abs(from)}–${Math.abs(to)} ${to < 0 ? "BC" : "AC"}`;
  return `${yearLabel(from)} – ${yearLabel(to)}`;
}

function clusterColumn({
  events,
  yFor,
}: {
  events: TimelineEvent[];
  yFor: (year: number) => number;
}): TimelineNode[] {
  const sorted = [...events].sort(
    (a, b) => a.year - b.year || a.name.localeCompare(b.name),
  );

  const groups = sorted.reduce<TimelineEvent[][]>((acc, event) => {
    const group = acc.at(-1);
    const previous = group?.at(-1);
    if (!group || !previous) return [...acc, [event]];
    if (yFor(event.year) - yFor(previous.year) > CLUSTER_GAP_PX) {
      return [...acc, [event]];
    }
    return [...acc.slice(0, -1), [...group, event]];
  }, []);

  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    if (group.length === 1) {
      return { kind: "single", y: yFor(first.year), event: first };
    }
    return {
      kind: "cluster",
      y: yFor(first.year),
      label: `${group.length} events`,
      when: yearSpanLabel({ from: first.year, to: last.year }),
      events: group,
    };
  });
}

const EMPTY_COLUMNS: Record<Landmass, TimelineNode[]> = {
  westeros: [],
  essos: [],
  "summer-isles": [],
};

export function buildTimeline({
  battles,
}: {
  battles: Battle[];
}): TimelineModel {
  if (!battles.length) {
    return { height: 0, ticks: [], eras: [], columns: { ...EMPTY_COLUMNS } };
  }

  const years = battles.map((battle) => absoluteYear(battle.start));
  const minYear = Math.floor(Math.min(...years) / 1000) * 1000;
  const maxYear = Math.ceil(Math.max(...years) / 50) * 50;

  const yFor = (year: number): number =>
    (year - minYear) * PX_PER_YEAR + TOP_PAD_PX;
  const height = yFor(maxYear) + BOTTOM_PAD_PX;

  const bcMillennia = Array.from(
    { length: Math.max(0, Math.floor(-minYear / 1000)) },
    (_, i) => minYear + i * 1000,
  );
  const acHalfCenturies = Array.from(
    { length: Math.max(0, Math.floor(maxYear / 50)) },
    (_, i) => (i + 1) * 50,
  );
  const ticks: TimelineTick[] = [
    ...bcMillennia.map((year) => ({ y: yFor(year), label: `${-year} BC` })),
    ...(minYear < 0 && maxYear >= 0
      ? [{ y: yFor(0), label: "Aegon's Conquest" }]
      : []),
    ...acHalfCenturies.map((year) => ({ y: yFor(year), label: `${year} AC` })),
  ];

  const eras: TimelineEra[] = ERA_BANDS.filter(
    (band) => band.to > minYear && band.from < maxYear,
  ).map((band) => {
    const from = Math.max(band.from, minYear);
    const to = Math.min(band.to, maxYear);
    return {
      label: band.label,
      top: yFor(from),
      height: (to - from) * PX_PER_YEAR,
    };
  });

  const toEvent = (battle: Battle): TimelineEvent => ({
    slug: battle.slug,
    name: battle.name,
    href: `/battles/${battle.slug}/`,
    year: absoluteYear(battle.start),
    when: formatBattleWhen(battle.start, battle.end),
  });

  const byLandmass = battles.reduce<Record<Landmass, TimelineEvent[]>>(
    (acc, battle) => ({
      ...acc,
      [landmassForBattle({ battle })]: [
        ...acc[landmassForBattle({ battle })],
        toEvent(battle),
      ],
    }),
    { westeros: [], essos: [], "summer-isles": [] },
  );

  const columns: Record<Landmass, TimelineNode[]> = {
    westeros: clusterColumn({ events: byLandmass.westeros, yFor }),
    essos: clusterColumn({ events: byLandmass.essos, yFor }),
    "summer-isles": clusterColumn({ events: byLandmass["summer-isles"], yFor }),
  };

  return { height, ticks, eras, columns };
}
