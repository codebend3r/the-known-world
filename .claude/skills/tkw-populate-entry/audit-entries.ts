/**
 * Ranks under-populated entries across the five collections that no populate
 * skill covers: battles, castles, dragons, events, weapons.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-populate-entry/audit-entries.ts
 *   bun .claude/skills/tkw-populate-entry/audit-entries.ts --collection castles
 *   bun .claude/skills/tkw-populate-entry/audit-entries.ts --limit 40
 *   bun .claude/skills/tkw-populate-entry/audit-entries.ts --json
 *
 * Read-only. Touches no files.
 *
 * Absolute emptiness is a bad signal in these collections, because several
 * schema fields are empty on every entry by convention rather than by
 * oversight (`sworn-houses` on 146/146 castles, `mentions` on 72/72 battles,
 * `participants` on 53/53 events). So a field only counts as a gap when the
 * rest of its own collection fills it: the score measures deviation from the
 * collection norm, not distance from the schema.
 */
import {
  loadAllBattles,
  loadAllCastles,
  loadAllDragons,
  loadAllEvents,
  loadAllWeapons,
} from "@/lib/content";
import type { Battle, Castle, Dragon, Event, Weapon } from "@/lib/schemas";

/** Bodies at or under this many non-whitespace characters are stubs. */
const STUB_BODY_CHARS = 200;

/**
 * Bodies under this fraction of their collection's median are thin. Collections
 * differ by an order of magnitude (battles run long, castles run short), so a
 * fixed character count would flag every castle or no battle.
 */
const THIN_BODY_RATIO = 0.5;

/** A field filled on at least this share of its collection is expected. */
const EXPECTED_FILL_RATE = 0.5;

const WEIGHTS = {
  empty: 10,
  stub: 6,
  thin: 2,
  unsourced: 3,
  draft: 4,
  gap: 1,
} as const;

const COLLECTION_NAMES = [
  "battles",
  "castles",
  "dragons",
  "events",
  "weapons",
] as const;

type CollectionName = (typeof COLLECTION_NAMES)[number];

type BodyState = "empty" | "stub" | "thin" | "ok";

/** Every content schema carries these three, which is all the audit needs. */
type Auditable = {
  name: string;
  sources: ReadonlyArray<unknown>;
  draft: boolean;
};

type Entry<T> = { slug: string; body: string; frontmatter: T };

type FieldProbe<T> = {
  field: string;
  filled: (frontmatter: T) => boolean;
  /** Fields that only make sense for some entries, such as a dragon's death. */
  applies?: (frontmatter: T) => boolean;
};

type ExpectedField<T> = { field: string; rate: number; probe: FieldProbe<T> };

type Finding = {
  collection: CollectionName;
  slug: string;
  name: string;
  bodyChars: number;
  bodyState: BodyState;
  sourced: boolean;
  draft: boolean;
  gaps: string[];
  score: number;
};

type CollectionAudit = {
  collection: CollectionName;
  entries: number;
  medianBody: number;
  expected: string[];
  findings: Finding[];
};

const CASTLE_PROBES: ReadonlyArray<FieldProbe<Castle>> = [
  { field: "sub-region", filled: (fm) => !!fm["sub-region"] },
  { field: "liege-house", filled: (fm) => !!fm["liege-house"] },
  { field: "founded", filled: (fm) => !!fm.founded },
  { field: "features", filled: (fm) => fm.features.length > 0 },
  { field: "sworn-houses", filled: (fm) => fm["sworn-houses"].length > 0 },
];

const BATTLE_PROBES: ReadonlyArray<FieldProbe<Battle>> = [
  { field: "war", filled: (fm) => !!fm.war },
  { field: "location", filled: (fm) => !!fm.location },
  { field: "region", filled: (fm) => !!fm.region },
  { field: "participants", filled: (fm) => fm.participants.length > 0 },
  { field: "commanders", filled: (fm) => fm.commanders.length > 0 },
  { field: "victor", filled: (fm) => !!fm.victor },
  { field: "outcome", filled: (fm) => !!fm.outcome },
  { field: "casualties", filled: (fm) => fm.casualties.length > 0 },
  { field: "aliases", filled: (fm) => fm.aliases.length > 0 },
  { field: "mentions", filled: (fm) => fm.mentions.length > 0 },
];

const EVENT_PROBES: ReadonlyArray<FieldProbe<Event>> = [
  { field: "participants", filled: (fm) => fm.participants.length > 0 },
  { field: "outcome", filled: (fm) => !!fm.outcome },
  { field: "casualties", filled: (fm) => fm.casualties.length > 0 },
];

const WEAPON_PROBES: ReadonlyArray<FieldProbe<Weapon>> = [
  { field: "origin-house", filled: (fm) => !!fm["origin-house"] },
  {
    field: "current-house",
    filled: (fm) => !!fm["current-house"],
    applies: (fm) => fm.status === "extant",
  },
  { field: "forged", filled: (fm) => !!fm.forged },
  {
    field: "destroyed",
    filled: (fm) => !!fm.destroyed,
    applies: (fm) => fm.status === "destroyed",
  },
  { field: "wielders", filled: (fm) => fm.wielders.length > 0 },
  { field: "aliases", filled: (fm) => fm.aliases.length > 0 },
  { field: "mentions", filled: (fm) => fm.mentions.length > 0 },
];

const DRAGON_PROBES: ReadonlyArray<FieldProbe<Dragon>> = [
  { field: "color", filled: (fm) => !!fm.color },
  { field: "size", filled: (fm) => !!fm.size },
  { field: "hatched", filled: (fm) => !!fm.hatched },
  {
    field: "died",
    filled: (fm) => !!fm.died,
    applies: (fm) => fm.status === "dead",
  },
  { field: "house", filled: (fm) => !!fm.house },
  { field: "riders", filled: (fm) => fm.riders.length > 0 },
  { field: "aliases", filled: (fm) => fm.aliases.length > 0 },
  { field: "mentions", filled: (fm) => fm.mentions.length > 0 },
];

function nonWhitespaceLength(body: string): number {
  return body.replace(/\s/g, "").length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function classifyBody({
  chars,
  medianChars,
}: {
  chars: number;
  medianChars: number;
}): BodyState {
  if (chars === 0) return "empty";
  if (chars <= STUB_BODY_CHARS) return "stub";
  return chars < medianChars * THIN_BODY_RATIO ? "thin" : "ok";
}

function bodyWeight(state: BodyState): number {
  if (state === "empty") return WEIGHTS.empty;
  if (state === "stub") return WEIGHTS.stub;
  return state === "thin" ? WEIGHTS.thin : 0;
}

/**
 * A probe only earns its place in the ranking when most of the collection
 * already answers it. `sworn-houses` is empty on every castle, so an empty one
 * is the convention, not a hole worth researching.
 */
function expectedFields<T>({
  entries,
  probes,
}: {
  entries: ReadonlyArray<Entry<T>>;
  probes: ReadonlyArray<FieldProbe<T>>;
}): Array<ExpectedField<T>> {
  return probes.flatMap((probe) => {
    const applicable = entries.filter(
      (entry) => probe.applies?.(entry.frontmatter) ?? true,
    );
    if (applicable.length === 0) return [];
    const filled = applicable.filter((entry) =>
      probe.filled(entry.frontmatter),
    ).length;
    const rate = filled / applicable.length;
    return rate >= EXPECTED_FILL_RATE
      ? [{ field: probe.field, rate, probe }]
      : [];
  });
}

function auditCollection<T extends Auditable>({
  collection,
  entries,
  probes,
}: {
  collection: CollectionName;
  entries: ReadonlyArray<Entry<T>>;
  probes: ReadonlyArray<FieldProbe<T>>;
}): CollectionAudit {
  const medianBody = median(
    entries.map((entry) => nonWhitespaceLength(entry.body)),
  );
  const expected = expectedFields({ entries, probes });

  const findings = entries.flatMap<Finding>((entry) => {
    const bodyChars = nonWhitespaceLength(entry.body);
    const bodyState = classifyBody({
      chars: bodyChars,
      medianChars: medianBody,
    });
    const gaps = expected.flatMap(({ field, probe }) =>
      (probe.applies?.(entry.frontmatter) ?? true) &&
      !probe.filled(entry.frontmatter)
        ? [field]
        : [],
    );
    const sourced = entry.frontmatter.sources.length > 0;
    const draft = entry.frontmatter.draft;
    const score =
      bodyWeight(bodyState) +
      (sourced ? 0 : WEIGHTS.unsourced) +
      (draft ? WEIGHTS.draft : 0) +
      gaps.length * WEIGHTS.gap;
    return score === 0
      ? []
      : [
          {
            collection,
            slug: entry.slug,
            name: entry.frontmatter.name,
            bodyChars,
            bodyState,
            sourced,
            draft,
            gaps,
            score,
          },
        ];
  });

  return {
    collection,
    entries: entries.length,
    medianBody,
    expected: expected.map(
      ({ field, rate }) => `${field} ${Math.round(rate * 100)}%`,
    ),
    findings,
  };
}

function isCollectionName(value: string): value is CollectionName {
  return COLLECTION_NAMES.some((name) => name === value);
}

function parseArgs(argv: readonly string[]) {
  const limitFlag = argv.indexOf("--limit");
  const collectionFlag = argv.indexOf("--collection");
  const rawCollection =
    collectionFlag === -1 ? null : (argv[collectionFlag + 1] ?? null);
  return {
    limit: limitFlag === -1 ? 25 : Number(argv[limitFlag + 1] ?? "25") || 25,
    json: argv.includes("--json"),
    collection:
      !!rawCollection && isCollectionName(rawCollection) ? rawCollection : null,
  };
}

function formatTable(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  if (rows.length === 0) return "";
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((cells) => cells[column].length)),
  );
  return rows
    .map((cells) =>
      cells
        .map((cell, column) => cell.padEnd(widths[column]))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

function summaryTable(audits: ReadonlyArray<CollectionAudit>): string {
  const count = (audit: CollectionAudit, state: BodyState) =>
    String(
      audit.findings.filter((finding) => finding.bodyState === state).length,
    );
  return formatTable([
    [
      "COLLECTION",
      "ENTRIES",
      "MEDIAN",
      "EMPTY",
      "STUB",
      "THIN",
      "UNSOURCED",
      "DRAFT",
    ],
    ...audits.map((audit) => [
      audit.collection,
      String(audit.entries),
      String(audit.medianBody),
      count(audit, "empty"),
      count(audit, "stub"),
      count(audit, "thin"),
      String(audit.findings.filter((finding) => !finding.sourced).length),
      String(audit.findings.filter((finding) => finding.draft).length),
    ]),
  ]);
}

function findingsTable(findings: ReadonlyArray<Finding>): string {
  return formatTable([
    ["#", "SCORE", "COLLECTION", "SLUG", "BODY", "SRC", "GAPS"],
    ...findings.map((finding, index) => [
      String(index + 1),
      String(finding.score),
      finding.collection,
      `${finding.slug}${finding.bodyState === "ok" ? "" : ` (${finding.bodyState})`}`,
      String(finding.bodyChars),
      finding.sourced ? "yes" : "NO",
      finding.gaps.join(", ") || "-",
    ]),
  ]);
}

const { limit, json, collection } = parseArgs(Bun.argv.slice(2));

const [battles, castles, dragons, events, weapons] = await Promise.all([
  loadAllBattles(),
  loadAllCastles(),
  loadAllDragons(),
  loadAllEvents(),
  loadAllWeapons(),
]);

const audits: CollectionAudit[] = [
  auditCollection({
    collection: "battles",
    entries: battles,
    probes: BATTLE_PROBES,
  }),
  auditCollection({
    collection: "castles",
    entries: castles,
    probes: CASTLE_PROBES,
  }),
  auditCollection({
    collection: "dragons",
    entries: dragons,
    probes: DRAGON_PROBES,
  }),
  auditCollection({
    collection: "events",
    entries: events,
    probes: EVENT_PROBES,
  }),
  auditCollection({
    collection: "weapons",
    entries: weapons,
    probes: WEAPON_PROBES,
  }),
].filter((audit) => collection === null || audit.collection === collection);

const ranked = audits
  .flatMap((audit) => audit.findings)
  .sort(
    (a, b) =>
      b.score - a.score ||
      a.bodyChars - b.bodyChars ||
      a.slug.localeCompare(b.slug),
  );

if (json) {
  console.log(
    JSON.stringify(
      {
        collections: audits.map(({ findings: _findings, ...rest }) => rest),
        findings: ranked.slice(0, limit),
      },
      null,
      2,
    ),
  );
} else {
  console.log(summaryTable(audits));
  console.log("\nExpected fields (filled on at least half the collection):");
  audits.forEach((audit) =>
    console.log(
      `  ${audit.collection}: ${audit.expected.join(", ") || "none"}`,
    ),
  );
  console.log(
    `\n${ranked.length} entries scored above zero. Showing ${Math.min(limit, ranked.length)}.\n`,
  );
  console.log(findingsTable(ranked.slice(0, limit)));
  console.log(
    `\nSCORE = body (empty ${WEIGHTS.empty}, stub ${WEIGHTS.stub}, thin ${WEIGHTS.thin}) ` +
      `+ ${WEIGHTS.unsourced} unsourced + ${WEIGHTS.draft} draft + ${WEIGHTS.gap} per missing expected field. ` +
      `Stub is at or under ${STUB_BODY_CHARS} non-whitespace characters; thin is under ` +
      `${THIN_BODY_RATIO * 100}% of the collection median.`,
  );
}
