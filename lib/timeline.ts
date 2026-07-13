import type { Battle, Event, Landmass } from "@/lib/schemas";
import { absoluteYear, formatBattleWhen } from "@/lib/battle-date";

export type { Landmass } from "@/lib/schemas";

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
export const MAX_CLUSTER_SPAN_YEARS = 10;

/**
 * Zoom multipliers applied to `PX_PER_YEAR`. A larger multiplier spreads
 * events farther apart, so clusters that only formed because entries sat
 * within `CLUSTER_GAP_PX` of one another break back into individual nodes.
 *
 * The top level puts each year more than `CLUSTER_GAP_PX` apart
 * (`16 * PX_PER_YEAR = 32px` per year > `28px`), so at full zoom a cluster can
 * only hold events sharing a single year: enough to read one year at a time.
 */
export const ZOOM_LEVELS = [0.5, 1, 2, 4, 8, 16] as const;
/** Index into `ZOOM_LEVELS` for the default 1x view (`PX_PER_YEAR`). */
export const DEFAULT_ZOOM_INDEX = 1;

const TOP_PAD_PX = 48;
/** Must fit a bottom cluster's expanded list — `.list` max-height 18rem in `TimelineCluster.module.scss`. */
const BOTTOM_PAD_PX = 400;

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

/**
 * Zoom-independent, serializable placement: events already sorted into their
 * landmass columns plus the overall year range. Computed once on the server,
 * then laid out at any `pxPerYear` on the client.
 */
export type TimelineSource = {
  minYear: number;
  maxYear: number;
  columns: Record<Landmass, TimelineEvent[]>;
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
    const first = group?.at(0);
    if (!group || !previous || !first) return [...acc, [event]];
    const tooFar = yFor(event.year) - yFor(previous.year) > CLUSTER_GAP_PX;
    const tooWide = event.year - first.year > MAX_CLUSTER_SPAN_YEARS;
    if (tooFar || tooWide) return [...acc, [event]];
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

/** Pixel offset of a year within the chart body at a given vertical scale. */
export function yForYear({
  year,
  minYear,
  pxPerYear,
}: {
  year: number;
  minYear: number;
  pxPerYear: number;
}): number {
  return (year - minYear) * pxPerYear + TOP_PAD_PX;
}

/** Inverse of `yForYear`: the year at a pixel offset within the chart body. */
export function yearForY({
  y,
  minYear,
  pxPerYear,
}: {
  y: number;
  minYear: number;
  pxPerYear: number;
}): number {
  return (y - TOP_PAD_PX) / pxPerYear + minYear;
}

/**
 * Sort battles and events into their landmass columns and compute the overall
 * year range. The result is zoom-independent and serializable, so it can be
 * built once on the server and laid out at any `pxPerYear` on the client.
 */
export function prepareTimeline({
  battles,
  events = [],
}: {
  battles: Battle[];
  events?: Event[];
}): TimelineSource {
  if (!battles.length && !events.length) {
    return {
      minYear: 0,
      maxYear: 0,
      columns: { westeros: [], essos: [], "summer-isles": [] },
    };
  }

  const years = [
    ...battles.map((battle) => absoluteYear(battle.start)),
    ...events.map((event) => absoluteYear(event.date)),
  ];
  const minYear = Math.floor(Math.min(...years) / 1000) * 1000;
  const maxYear = Math.ceil(Math.max(...years) / 50) * 50;

  const placed: Array<{ landmass: Landmass; event: TimelineEvent }> = [
    ...battles.map((battle) => ({
      landmass: landmassForBattle({ battle }),
      event: {
        slug: battle.slug,
        name: battle.name,
        href: `/battles/${battle.slug}/`,
        year: absoluteYear(battle.start),
        when: formatBattleWhen(battle.start, battle.end),
      },
    })),
    ...events.map((event) => ({
      landmass: event.landmass,
      event: {
        slug: event.slug,
        name: event.name,
        href: `/events/${event.slug}/`,
        year: absoluteYear(event.date),
        when: formatBattleWhen(event.date, event.date),
      },
    })),
  ];

  const columns = placed.reduce<Record<Landmass, TimelineEvent[]>>(
    (acc, { landmass, event }) => ({
      ...acc,
      [landmass]: [...acc[landmass], event],
    }),
    { westeros: [], essos: [], "summer-isles": [] },
  );

  return { minYear, maxYear, columns };
}

/**
 * Lay a prepared timeline out at a given vertical scale. Clustering keys off
 * the pixel gap between entries, so a larger `pxPerYear` (zoom-in) pulls
 * grouped events apart into individual nodes.
 */
export function layoutTimeline({
  source,
  pxPerYear = PX_PER_YEAR,
}: {
  source: TimelineSource;
  pxPerYear?: number;
}): TimelineModel {
  const { minYear, maxYear } = source;
  const isEmpty = LANDMASSES.every(
    (landmass) => source.columns[landmass].length === 0,
  );
  if (isEmpty) {
    return { height: 0, ticks: [], eras: [], columns: { ...EMPTY_COLUMNS } };
  }

  const yFor = (year: number): number => yForYear({ year, minYear, pxPerYear });
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
      height: (to - from) * pxPerYear,
    };
  });

  const columns: Record<Landmass, TimelineNode[]> = {
    westeros: clusterColumn({ events: source.columns.westeros, yFor }),
    essos: clusterColumn({ events: source.columns.essos, yFor }),
    "summer-isles": clusterColumn({
      events: source.columns["summer-isles"],
      yFor,
    }),
  };

  return { height, ticks, eras, columns };
}

export function buildTimeline({
  battles,
  events = [],
  pxPerYear = PX_PER_YEAR,
}: {
  battles: Battle[];
  events?: Event[];
  pxPerYear?: number;
}): TimelineModel {
  return layoutTimeline({
    source: prepareTimeline({ battles, events }),
    pxPerYear,
  });
}
