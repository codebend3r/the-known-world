/**
 * Ranks unpopulated character entries by how much the rest of the corpus
 * already wants them, so populating work starts with the stubs that the most
 * pages already point at.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/content-triage/triage.ts
 *   bun .claude/skills/content-triage/triage.ts --limit 40
 *   bun .claude/skills/content-triage/triage.ts --json
 *   bun .claude/skills/content-triage/triage.ts --state stub
 *
 * Read-only. Touches no files.
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

/** Bodies at or under this many non-whitespace characters are stubs. */
const STUB_BODY_CHARS = 200;

type EntryState = "empty" | "stub";

type Candidate = {
  slug: string;
  name: string;
  house: string | null;
  state: EntryState;
  placeholder: boolean;
  /** Inbound references from frontmatter fields across every collection. */
  structured: number;
  /** Other entries whose prose names this character but cannot link to it. */
  prose: number;
  /** Sits in a family tree, so the stub renders as a node others traverse. */
  inTree: boolean;
  demand: number;
};

function nonWhitespaceLength(body: string): number {
  return body.replace(/\s/g, "").length;
}

function entryState(body: string): EntryState | null {
  const size = nonWhitespaceLength(body);
  if (size === 0) return "empty";
  if (size <= STUB_BODY_CHARS) return "stub";
  return null;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Counts every frontmatter field that `lib/content-integrity.ts` validates as
 * a character-slug reference. Keeping this list in step with that file is what
 * makes the ranking trustworthy.
 */
function countStructuredReferences({
  characters,
  houses,
  weapons,
  dragons,
  battles,
}: {
  characters: Awaited<ReturnType<typeof loadAllCharacters>>;
  houses: Awaited<ReturnType<typeof loadAllHouses>>;
  weapons: Awaited<ReturnType<typeof loadAllWeapons>>;
  dragons: Awaited<ReturnType<typeof loadAllDragons>>;
  battles: Awaited<ReturnType<typeof loadAllBattles>>;
}): Map<string, number> {
  const referenceLists = [
    ...characters.flatMap(({ frontmatter }) => [
      frontmatter.parents,
      frontmatter.spouses,
      frontmatter.children,
      frontmatter.mentions,
    ]),
    ...houses.flatMap(({ frontmatter }) => [
      (frontmatter.heads ?? []).flatMap((entry) => entry.slug ?? []),
      (frontmatter["notable-members"] ?? []).flatMap(
        (entry) => entry.slug ?? [],
      ),
      frontmatter.mentions,
    ]),
    ...weapons.flatMap(({ frontmatter }) => [
      frontmatter.wielders,
      frontmatter.mentions,
    ]),
    ...dragons.flatMap(({ frontmatter }) => [
      frontmatter.riders,
      frontmatter.mentions,
    ]),
    ...battles.map(({ frontmatter }) => frontmatter.commanders),
  ];

  return referenceLists
    .flat()
    .reduce<Map<string, number>>(
      (counts, slug) => counts.set(slug, (counts.get(slug) ?? 0) + 1),
      new Map(),
    );
}

/**
 * Counts bodies elsewhere in the corpus that name this character. These are
 * links the reader never gets: `buildProseLinkIndex` in `lib/prose-links.ts`
 * drops any character whose frontmatter carries `placeholder: true`, so every
 * hit here becomes a live auto-link the moment the entry is populated.
 *
 * `houseNames` suppresses surname-only forms. Unnamed tree nodes are stored as
 * `name: Stark`, which would otherwise match every body that mentions the
 * house and drown the ranking in noise.
 */
function countProseMentions({
  candidateSlugs,
  charactersBySlug,
  houseNames,
  corpus,
}: {
  candidateSlugs: readonly string[];
  charactersBySlug: Map<string, { name: string; aliases: readonly string[] }>;
  houseNames: ReadonlySet<string>;
  corpus: ReadonlyArray<{ key: string; body: string }>;
}): Map<string, number> {
  return candidateSlugs.reduce<Map<string, number>>((counts, slug) => {
    const character = charactersBySlug.get(slug);
    if (!character) return counts;
    const forms = [character.name, ...character.aliases].filter(
      (form) => form.length > 2 && !houseNames.has(form.toLowerCase()),
    );
    if (forms.length === 0) return counts.set(slug, 0);
    const pattern = new RegExp(
      `\\b(${forms.map(escapeForRegExp).join("|")})\\b`,
    );
    const hits = corpus.reduce(
      (total, entry) =>
        entry.key === `characters/${slug}` || !pattern.test(entry.body)
          ? total
          : total + 1,
      0,
    );
    return counts.set(slug, hits);
  }, new Map());
}

function parseArgs(argv: readonly string[]) {
  const limitFlag = argv.indexOf("--limit");
  const stateFlag = argv.indexOf("--state");
  const rawState = stateFlag === -1 ? null : (argv[stateFlag + 1] ?? null);
  return {
    limit: limitFlag === -1 ? 25 : Number(argv[limitFlag + 1] ?? "25") || 25,
    json: argv.includes("--json"),
    state: rawState === "empty" || rawState === "stub" ? rawState : null,
  };
}

function formatTable(rows: readonly Candidate[]): string {
  const header = ["#", "DEMAND", "REFS", "PROSE", "TREE", "SLUG", "HOUSE"];
  const body = rows.map((row, index) => [
    String(index + 1),
    String(row.demand),
    String(row.structured),
    String(row.prose),
    row.inTree ? "yes" : "-",
    `${row.slug}${row.state === "empty" ? "" : " (stub)"}`,
    row.house ?? "-",
  ]);
  const widths = header.map((_, column) =>
    Math.max(
      header[column].length,
      ...body.map((cells) => cells[column].length),
    ),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, column) => cell.padEnd(widths[column]))
      .join("  ")
      .trimEnd();
  return [line(header), ...body.map(line)].join("\n");
}

const { limit, json, state } = parseArgs(Bun.argv.slice(2));

const [characters, houses, weapons, dragons, battles, castles, events] =
  await Promise.all([
    loadAllCharacters(),
    loadAllHouses(),
    loadAllWeapons(),
    loadAllDragons(),
    loadAllBattles(),
    loadAllCastles(),
    loadAllEvents(),
  ]);

const structured = countStructuredReferences({
  characters,
  houses,
  weapons,
  dragons,
  battles,
});

/**
 * `placeholder-reason: unnamed` marks a person the source material never named:
 * a family-tree node that exists so the tree connects, not a backlog item. No
 * amount of research populates one, so they are counted and excluded rather
 * than ranked. `uncertain` is likewise not a writing task.
 */
const WRITABLE_REASONS = new Set([null, "unwritten"]);

const allUnpopulated = characters.flatMap(({ frontmatter, body, slug }) => {
  const found = entryState(body);
  return found === null ? [] : [{ frontmatter, slug, state: found }];
});

const structuralNodes = allUnpopulated.filter(
  ({ frontmatter }) => !WRITABLE_REASONS.has(frontmatter["placeholder-reason"]),
);

const unpopulated = allUnpopulated.filter(({ frontmatter }) =>
  WRITABLE_REASONS.has(frontmatter["placeholder-reason"]),
);

const corpus = [
  ...characters.map((entry) => ({
    key: `characters/${entry.slug}`,
    body: entry.body,
  })),
  ...houses.map((entry) => ({ key: `houses/${entry.slug}`, body: entry.body })),
  ...battles.map((entry) => ({
    key: `battles/${entry.slug}`,
    body: entry.body,
  })),
  ...castles.map((entry) => ({
    key: `castles/${entry.slug}`,
    body: entry.body,
  })),
  ...events.map((entry) => ({ key: `events/${entry.slug}`, body: entry.body })),
  ...weapons.map((entry) => ({
    key: `weapons/${entry.slug}`,
    body: entry.body,
  })),
  ...dragons.map((entry) => ({
    key: `dragons/${entry.slug}`,
    body: entry.body,
  })),
];

const prose = countProseMentions({
  candidateSlugs: unpopulated.map((entry) => entry.slug),
  charactersBySlug: new Map(
    characters.map(({ frontmatter }) => [
      frontmatter.slug,
      { name: frontmatter.name, aliases: frontmatter.aliases },
    ]),
  ),
  houseNames: new Set(
    houses.map(({ frontmatter }) =>
      frontmatter.name.replace(/^House\s+/i, "").toLowerCase(),
    ),
  ),
  corpus,
});

const ranked: Candidate[] = unpopulated
  .map(({ frontmatter, slug, state: found }) => {
    const structuredCount = structured.get(slug) ?? 0;
    const proseCount = prose.get(slug) ?? 0;
    return {
      slug,
      name: frontmatter.name,
      house: frontmatter["primary-house"],
      state: found,
      placeholder: frontmatter.placeholder,
      structured: structuredCount,
      prose: proseCount,
      inTree:
        frontmatter.parents.length +
          frontmatter.children.length +
          frontmatter.spouses.length >
        0,
      demand: structuredCount + proseCount,
    };
  })
  .filter((candidate) => state === null || candidate.state === state)
  .sort((a, b) => b.demand - a.demand || a.slug.localeCompare(b.slug));

if (json) {
  console.log(JSON.stringify(ranked.slice(0, limit), null, 2));
} else {
  const empty = ranked.filter((row) => row.state === "empty").length;
  console.log(
    `${ranked.length} writable of ${characters.length} characters ` +
      `(${empty} empty, ${ranked.length - empty} stub). ` +
      `${structuralNodes.length} unnamed tree nodes excluded.\n`,
  );
  console.log(formatTable(ranked.slice(0, limit)));
  console.log(
    `\nDEMAND = REFS + PROSE. REFS = frontmatter links pointing here. ` +
      `PROSE = other entries that name this character but cannot link to it yet.`,
  );
}
