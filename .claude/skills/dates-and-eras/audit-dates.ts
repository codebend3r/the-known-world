/**
 * Reports every mechanically detectable defect in the corpus's dated fields:
 * sign errors, era and year disagreement, reversed pairs, impossible lifespans
 * and lineages, status contradictions, and overclaimed precision.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/dates-and-eras/audit-dates.ts
 *   bun .claude/skills/dates-and-eras/audit-dates.ts --collection houses
 *   bun .claude/skills/dates-and-eras/audit-dates.ts --json
 *
 * Read-only. Touches no files.
 *
 * The rules live in `lib/date-integrity.ts` and run in CI through
 * `contentIntegrityErrors`. This script only groups and prints them, so there
 * is one definition of a defect rather than two that drift apart.
 */
import {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import {
  DATE_DEFECT_CLASSES,
  dateIntegrityDefects,
  type DateCollectionName,
  type DateDefect,
  type DateDefectClass,
} from "@/lib/date-integrity";

const COLLECTION_NAMES = [
  "battles",
  "castles",
  "characters",
  "dragons",
  "events",
  "houses",
  "weapons",
] as const satisfies readonly DateCollectionName[];

type CollectionName = (typeof COLLECTION_NAMES)[number];

const CLASS_SUMMARY = {
  sign: "AC or BC year stored non-positive, so absoluteYear() flips it",
  "era-range": "the era does not contain the year on the axis",
  ordering: "a terminal date falls before the date that opens it",
  lifespan: "the age ageAtDeath() would print is impossible",
  lineage: "a child predates a parent, or long outlives their death",
  status: "a terminal date on an entry whose status says it never ended",
  precision: 'precision "exact" claimed with nothing cited to support it',
} as const satisfies Record<DateDefectClass, string>;

function isCollectionName(value: string): value is CollectionName {
  return COLLECTION_NAMES.some((name) => name === value);
}

type Scope =
  | { kind: "all" }
  | { kind: "collection"; collection: CollectionName }
  | { kind: "unknown"; requested: string };

type Args = { json: boolean; scope: Scope };

function parseArgs(argv: readonly string[]): Args {
  const flag = argv.indexOf("--collection");
  const raw = flag === -1 ? null : (argv[flag + 1] ?? null);
  const json = argv.includes("--json");
  if (raw === null) return { json, scope: { kind: "all" } };
  if (isCollectionName(raw)) {
    return { json, scope: { kind: "collection", collection: raw } };
  }
  return { json, scope: { kind: "unknown", requested: raw } };
}

/** The collection to filter to, `null` for all, or exit 2 on an unknown name. */
function selectedCollection(scope: Scope): CollectionName | null {
  switch (scope.kind) {
    case "all":
      return null;
    case "collection":
      return scope.collection;
    case "unknown":
      console.error(
        `unknown --collection ${scope.requested}; expected one of ${COLLECTION_NAMES.join(", ")}`,
      );
      return process.exit(2);
    default: {
      const unhandled: never = scope;
      throw new Error(`unhandled scope: ${JSON.stringify(unhandled)}`);
    }
  }
}

function formatTable(rows: readonly DateDefect[]): string {
  const header = ["CLASS", "ENTRY", "DETAIL"];
  const body = rows.map((row) => [
    row.defect,
    `${row.collection}/${row.slug}.${row.field}`,
    row.detail,
  ]);
  const widths = header.map((_, column) =>
    Math.max(
      header[column].length,
      ...body.map((cells) => cells[column].length),
    ),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, column) =>
        column === header.length - 1 ? cell : cell.padEnd(widths[column]),
      )
      .join("  ")
      .trimEnd();
  return [line(header), ...body.map(line)].join("\n");
}

const { json, scope } = parseArgs(Bun.argv.slice(2));
const collection = selectedCollection(scope);

const [battles, castles, characters, dragons, events, houses, weapons] =
  await Promise.all([
    loadAllBattles(),
    loadAllCastles(),
    loadAllCharacters(),
    loadAllDragons(),
    loadAllEvents(),
    loadAllHouses(),
    loadAllWeapons(),
  ]);

const defects = dateIntegrityDefects({
  battles,
  castles,
  characters,
  dragons,
  events,
  houses,
  weapons,
})
  .filter((defect) => collection === null || defect.collection === collection)
  .sort(
    (a, b) =>
      DATE_DEFECT_CLASSES.indexOf(a.defect) -
        DATE_DEFECT_CLASSES.indexOf(b.defect) ||
      a.collection.localeCompare(b.collection) ||
      a.slug.localeCompare(b.slug) ||
      a.field.localeCompare(b.field),
  );

if (json) {
  console.log(JSON.stringify(defects, null, 2));
} else {
  const scope = collection ?? "all collections";
  const counts = defects.reduce<Map<DateDefectClass, number>>(
    (totals, defect) =>
      totals.set(defect.defect, (totals.get(defect.defect) ?? 0) + 1),
    new Map(),
  );

  console.log(`${defects.length} date defects in ${scope}.\n`);
  DATE_DEFECT_CLASSES.forEach((name) => {
    const count = counts.get(name) ?? 0;
    if (count > 0) {
      console.log(
        `  ${String(count).padStart(4)}  ${name.padEnd(10)} ${CLASS_SUMMARY[name]}`,
      );
    }
  });

  if (defects.length > 0) {
    console.log(`\n${formatTable(defects)}`);
    console.log(
      "\nFix the year when the era is sourced, the era when the year is sourced. " +
        "Where neither is, widen precision rather than invent a year.",
    );
  }
}
