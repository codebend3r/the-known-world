/**
 * Typographic checker for `content/`.
 *
 * Reports one violation per offending position, with file, line, and column:
 *
 *   em-dash         U+2014, banned outright by the house style
 *   en-dash         U+2013, same
 *   smart-quote     curly quotes and primes; the corpus is straight-quote only
 *   double-space    two or more spaces wedged between words
 *   trailing-space  whitespace at end of line
 *   non-ascii       any codepoint outside ASCII that is not an accented Latin letter
 *   bare-weapon     a named weapon the corpus italicises elsewhere, left bare here
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-prose-style/check-prose.ts
 *   bun .claude/skills/tkw-prose-style/check-prose.ts --collection houses
 *   bun .claude/skills/tkw-prose-style/check-prose.ts --json
 *
 * Read-only. Rewrites nothing. Exits 1 when any violation is found, so it can
 * gate CI; exits 0 only on a clean corpus.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";

const CONTENT_ROOT = path.join(process.cwd(), "content");

const COLLECTIONS = [
  "battles",
  "castles",
  "characters",
  "dragons",
  "events",
  "houses",
  "weapons",
] as const;

type Collection = (typeof COLLECTIONS)[number];

const isCollection = (value: string): value is Collection =>
  COLLECTIONS.some((collection) => collection === value);

const VIOLATION_KINDS = [
  "em-dash",
  "en-dash",
  "smart-quote",
  "double-space",
  "trailing-space",
  "non-ascii",
  "bare-weapon",
] as const;

type ViolationKind = (typeof VIOLATION_KINDS)[number];

type Violation = {
  collection: Collection;
  file: string;
  line: number;
  column: number;
  kind: ViolationKind;
  found: string;
  excerpt: string;
};

type Entry = {
  collection: Collection;
  slug: string;
  /** Repo-relative path, e.g. `content/houses/stark.md`. */
  file: string;
  raw: string;
  /** 1-based line number of the first body line, past the closing `---`. */
  bodyLine: number;
};

/**
 * Banned punctuation, built from code points on purpose: the source of a
 * checker that bans a character should not itself contain that character.
 */
const EM_DASH = 0x2014;
const EN_DASH = 0x2013;
const SMART_QUOTE_POINTS = [
  0x2018, 0x2019, 0x201b, 0x201c, 0x201d, 0x201e, 0x201f, 0x2032, 0x2033,
] as const;

const character = (codePoint: number): string =>
  String.fromCodePoint(codePoint);
const characterClass = (codePoints: readonly number[]): string =>
  `[${codePoints.map(character).join("")}]`;

/**
 * These rules run over frontmatter as well as body. A dash inside a
 * `sigil.description` string is still a dash.
 */
const CHARACTER_RULES: ReadonlyArray<{
  kind: ViolationKind;
  pattern: RegExp;
}> = [
  { kind: "em-dash", pattern: new RegExp(character(EM_DASH), "gu") },
  { kind: "en-dash", pattern: new RegExp(character(EN_DASH), "gu") },
  {
    kind: "smart-quote",
    pattern: new RegExp(characterClass(SMART_QUOTE_POINTS), "gu"),
  },
  { kind: "double-space", pattern: /(?<=\S) {2,}(?=\S)/gu },
  { kind: "trailing-space", pattern: /[ \t]+$/gu },
];

/** Punctuation already reported by a dedicated rule, so `non-ascii` skips it. */
const REPORTED_ELSEWHERE = new RegExp(
  characterClass([EN_DASH, EM_DASH, ...SMART_QUOTE_POINTS]),
  "u",
);

const NON_ASCII = /[^\p{ASCII}]/gu;
const LETTER = /^\p{L}$/u;

/**
 * Accented Latin letters are legitimate in proper nouns the corpus already
 * carries: `tenne`, `rayonne` and `nee` all take an acute accent in the house
 * and character entries. Everything else outside ASCII is treated as drift,
 * which is how pasted ellipses, non-breaking spaces, arrows and bullets get
 * caught.
 */
const LATIN_SUPPLEMENT_START = 0x00c0;
const LATIN_EXTENDED_B_END = 0x024f;

const isAllowedNonAscii = (found: string): boolean => {
  const codePoint = found.codePointAt(0) ?? 0;
  return (
    codePoint >= LATIN_SUPPLEMENT_START &&
    codePoint <= LATIN_EXTENDED_B_END &&
    LETTER.test(found)
  );
};

const escapeForPattern = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function readFlag({
  argv,
  flag,
}: {
  argv: readonly string[];
  flag: string;
}): string | null {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

/** 1-based line number where the body starts. Line 1 when there is no frontmatter. */
function bodyStartLine({ raw }: { raw: string }): number {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!match) return 1;
  return match[0].split("\n").length;
}

async function readCollection({
  collection,
}: {
  collection: Collection;
}): Promise<Entry[]> {
  const dir = path.join(CONTENT_ROOT, collection);
  const names = await fs.readdir(dir);
  return Promise.all(
    names
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map(async (name) => {
        const raw = await fs.readFile(path.join(dir, name), "utf-8");
        return {
          collection,
          slug: name.replace(/\.md$/, ""),
          file: `content/${collection}/${name}`,
          raw,
          bodyLine: bodyStartLine({ raw }),
        };
      }),
  );
}

type Hit = { index: number; text: string };

function findHits({ line, pattern }: { line: string; pattern: RegExp }): Hit[] {
  return Array.from(line.matchAll(pattern), (match) => ({
    index: match.index,
    text: match[0],
  }));
}

function excerptAround({
  line,
  index,
}: {
  line: string;
  index: number;
}): string {
  const start = Math.max(0, index - 42);
  const end = Math.min(line.length, index + 42);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < line.length ? "..." : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

const printable = (found: string): string =>
  found.trim().length === 0 ? `<${found.length} whitespace>` : `"${found}"`;

/**
 * A named weapon worth flagging when left bare, together with the pattern that
 * finds bare occurrences. `_Name_` is excluded by the `_` in the lookarounds.
 */
type WeaponRule = {
  slug: string;
  name: string;
  pattern: RegExp;
};

/**
 * Derives the weapon rules from the corpus rather than hardcoding them, so the
 * set tracks the content instead of drifting from it. A surface form qualifies
 * when both hold:
 *
 *   1. Some body already writes it as `_Name_`. That is what makes italics the
 *      established convention for that blade rather than this script's opinion.
 *   2. It does not appear inside the name or alias of any non-weapon entry.
 *      This is what drops `Blackfyre` (House Blackfyre, the Blackfyre
 *      Rebellions, the Blackfyre pretenders), `Dawn` (the Great Empire of the
 *      Dawn, the War for the Dawn, and by extension the Dawn Age) and `Ice`
 *      (the Battle of Ice). Flagging those would rewrite prose about houses,
 *      wars, and eras as if it were prose about swords.
 */
function buildWeaponRules({
  weapons,
  otherNames,
  bodies,
}: {
  weapons: ReadonlyArray<{
    slug: string;
    name: string;
    aliases: readonly string[];
  }>;
  otherNames: readonly string[];
  bodies: readonly string[];
}): WeaponRule[] {
  const corpus = bodies.join("\n");
  return weapons.flatMap((weapon) =>
    [weapon.name, ...weapon.aliases].flatMap((form) => {
      const escaped = escapeForPattern(form);
      const italicised = new RegExp(`_${escaped}_`).test(corpus);
      if (!italicised) return [];
      const collides = otherNames.some(
        (other) =>
          other !== form &&
          new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`).test(other),
      );
      if (collides) return [];
      return [
        {
          slug: weapon.slug,
          name: form,
          pattern: new RegExp(`(?<![\\w_])${escaped}(?![\\w_])`, "g"),
        },
      ];
    }),
  );
}

/** Character offsets covered by `_..._` emphasis on a single line. */
function emphasisSpans({ line }: { line: string }): Array<[number, number]> {
  return Array.from(line.matchAll(/_[^_]+_/g), (match) => [
    match.index,
    match.index + match[0].length,
  ]);
}

function checkEntry({
  entry,
  weaponRules,
}: {
  entry: Entry;
  weaponRules: readonly WeaponRule[];
}): Violation[] {
  const lines = entry.raw.split("\n");

  const characterViolations = lines.flatMap((line, offset) =>
    CHARACTER_RULES.flatMap(({ kind, pattern }) =>
      findHits({ line, pattern }).map((hit) => ({
        collection: entry.collection,
        file: entry.file,
        line: offset + 1,
        column: hit.index + 1,
        kind,
        found: printable(hit.text),
        excerpt: excerptAround({ line, index: hit.index }),
      })),
    ),
  );

  const nonAsciiViolations = lines.flatMap((line, offset) =>
    findHits({ line, pattern: NON_ASCII })
      .filter(
        (hit) =>
          !isAllowedNonAscii(hit.text) && !REPORTED_ELSEWHERE.test(hit.text),
      )
      .map((hit) => ({
        collection: entry.collection,
        file: entry.file,
        line: offset + 1,
        column: hit.index + 1,
        kind: "non-ascii" as const,
        found: `U+${(hit.text.codePointAt(0) ?? 0)
          .toString(16)
          .toUpperCase()
          .padStart(4, "0")}`,
        excerpt: excerptAround({ line, index: hit.index }),
      })),
  );

  // Weapon italics are a body convention. Frontmatter carries plain names, and
  // a `## Lady Forlorn` section heading is a label, not a mention in prose.
  const weaponViolations = lines.flatMap((line, offset) => {
    const lineNumber = offset + 1;
    if (lineNumber < entry.bodyLine) return [];
    if (line.trimStart().startsWith("#")) return [];
    const spans = emphasisSpans({ line });
    return weaponRules
      .filter(
        (rule) =>
          // A weapon's own entry names it plainly throughout; that is the
          // corpus convention, not drift.
          !(entry.collection === "weapons" && entry.slug === rule.slug),
      )
      .flatMap((rule) =>
        findHits({ line, pattern: rule.pattern })
          .filter(
            (hit) =>
              !spans.some(
                ([start, end]) => hit.index >= start && hit.index < end,
              ),
          )
          .map((hit) => ({
            collection: entry.collection,
            file: entry.file,
            line: lineNumber,
            column: hit.index + 1,
            kind: "bare-weapon" as const,
            found: `"${rule.name}"`,
            excerpt: excerptAround({ line, index: hit.index }),
          })),
      );
  });

  return [
    ...characterViolations,
    ...nonAsciiViolations,
    ...weaponViolations,
  ].sort((a, b) => a.line - b.line || a.column - b.column);
}

const argv = Bun.argv;
const asJson = argv.includes("--json");
const requested = readFlag({ argv, flag: "--collection" });

if (requested !== null && !isCollection(requested)) {
  console.error(
    `Unknown collection "${requested}". Expected one of: ${COLLECTIONS.join(", ")}`,
  );
  process.exit(2);
}

const selected: readonly Collection[] =
  requested !== null && isCollection(requested) ? [requested] : COLLECTIONS;

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

const weaponRules = buildWeaponRules({
  weapons: weapons.map(({ frontmatter }) => ({
    slug: frontmatter.slug,
    name: frontmatter.name,
    aliases: frontmatter.aliases,
  })),
  otherNames: [
    ...battles.flatMap(({ frontmatter }) => [
      frontmatter.name,
      ...frontmatter.aliases,
    ]),
    ...castles.map(({ frontmatter }) => frontmatter.name),
    ...characters.flatMap(({ frontmatter }) => [
      frontmatter.name,
      ...frontmatter.aliases,
    ]),
    ...dragons.flatMap(({ frontmatter }) => [
      frontmatter.name,
      ...frontmatter.aliases,
    ]),
    ...events.map(({ frontmatter }) => frontmatter.name),
    ...houses.map(({ frontmatter }) => frontmatter.name),
  ],
  bodies: [
    ...battles,
    ...castles,
    ...characters,
    ...dragons,
    ...events,
    ...houses,
    ...weapons,
  ].map(({ body }) => body),
});

const entries = (
  await Promise.all(
    selected.map((collection) => readCollection({ collection })),
  )
).flat();

const violations = entries.flatMap((entry) =>
  checkEntry({ entry, weaponRules }),
);

const byKind = VIOLATION_KINDS.map((kind) => ({
  kind,
  count: violations.filter((violation) => violation.kind === kind).length,
})).filter(({ count }) => count > 0);

const byCollection = selected
  .map((collection) => {
    const scoped = violations.filter(
      (violation) => violation.collection === collection,
    );
    return {
      collection,
      files: new Set(scoped.map((violation) => violation.file)).size,
      count: scoped.length,
      scanned: entries.filter((entry) => entry.collection === collection)
        .length,
    };
  })
  .filter(({ count }) => count > 0);

const filesTouched = new Set(violations.map((violation) => violation.file))
  .size;

if (asJson) {
  console.log(
    JSON.stringify(
      {
        scanned: entries.length,
        files: filesTouched,
        total: violations.length,
        byKind,
        byCollection,
        weaponRules: weaponRules.map(({ name }) => name),
        violations,
      },
      null,
      2,
    ),
  );
} else if (violations.length === 0) {
  console.log(`CLEAN. ${entries.length} files scanned, no violations.`);
} else {
  console.log(
    `PROSE VIOLATIONS: ${violations.length} across ${filesTouched} of ${entries.length} files\n`,
  );

  console.log("BY KIND");
  byKind.forEach(({ kind, count }) =>
    console.log(`  ${kind.padEnd(15)}${String(count).padStart(5)}`),
  );

  console.log("\nBY COLLECTION");
  byCollection.forEach(({ collection, files, count, scanned }) =>
    console.log(
      `  ${collection.padEnd(12)}${String(count).padStart(5)} in ${files}/${scanned} files`,
    ),
  );

  console.log("\nDETAIL");
  const grouped = violations.reduce<Map<string, Violation[]>>(
    (groups, violation) =>
      groups.set(violation.file, [
        ...(groups.get(violation.file) ?? []),
        violation,
      ]),
    new Map(),
  );
  [...grouped.entries()].forEach(([file, group]) => {
    console.log(`\n${file}`);
    group.forEach((violation) =>
      console.log(
        `  ${String(violation.line).padStart(4)}:${String(violation.column).padEnd(4)} ` +
          `${violation.kind.padEnd(15)}${violation.found}  ${violation.excerpt}`,
      ),
    );
  });

  console.log(
    `\nWeapon italics enforced for: ${weaponRules.map(({ name }) => name).join(", ")}`,
  );
}

process.exitCode = violations.length > 0 ? 1 : 0;
