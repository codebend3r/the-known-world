/**
 * Audits every directory under `components/` against the four-file convention
 * and the repo's CSS rules, reporting seven finding classes:
 *
 *   FILES      a missing `Name.tsx`, `Name.module.scss`, `index.ts`, or test
 *   BARREL     `index.ts` absent, empty, or re-exporting nothing
 *   TOKEN      a raw SCSS value that exactly matches a `styles/globals.scss` token
 *   FLEX       `display: flex` / `inline-flex` where grid is the house default
 *   MARGIN     a margin used for spacing rather than reset or centering
 *   DIV        a `<div>` in TSX carrying neither `className` nor `id`
 *   TEST       a component with no co-located test
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/component-scaffold/audit-components.ts
 *   bun .claude/skills/component-scaffold/audit-components.ts --json
 *
 * Read-only. Writes nothing. Exits 1 when anything is reported so it can gate
 * a pre-commit hook or a CI step.
 *
 * The token table is parsed out of `styles/globals.scss` at runtime rather than
 * duplicated here, so retuning a token there changes what this reports without
 * a second edit. A raw value is only flagged when a token holds the *identical*
 * value and belongs to the property's family; near-misses are token gaps, and
 * minting a token to close one is a design decision this script must not make.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, "components");
const TOKENS_FILE = path.join(ROOT, "styles", "globals.scss");

/**
 * Property families. A length token only substitutes for a raw value when the
 * declaration belongs to the family the token was minted for: `--tkw-radius`
 * is 7px, but a `gap: 7px` is a coincidence, not a radius.
 */
const LENGTH_FAMILIES: readonly { property: RegExp; token: RegExp }[] = [
  { property: /^font-size$/, token: /^--fs-/ },
  { property: /^line-height$/, token: /^--lh-/ },
  { property: /^letter-spacing$/, token: /^--ls-/ },
  { property: /^border-radius$/, token: /^--tkw-radius$/ },
  { property: /^(max-width|min-width|width)$/, token: /^--tkw-measure/ },
  {
    property: /^(padding|gap|row-gap|column-gap|margin)(-[a-z]+)?$/,
    token: /^--tkw-gutter$/,
  },
];

/**
 * Role guards. A token whose name states its role only substitutes where that
 * role applies. `--tkw-hairline-faint` and a gold wash behind an active option
 * are the same rgba by coincidence; binding the wash to the hairline token
 * would make retuning one silently move the other.
 */
const ROLE_GUARDS: readonly { token: RegExp; property: RegExp }[] = [
  { token: /^--tkw-hairline/, property: /^(border|outline)/ },
];

/** `margin: 0` is a browser reset and `margin: 0 auto` centres a fixed width. */
const MARGIN_RESET = /^0(\s+auto)?$/;

const MARGIN_PROPERTY =
  /^margin(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/;

/**
 * Unitless `0` and `1` are line-height resets, in the same class as
 * `margin: 0`. `--lh-title` happens to be `1`, but an icon button zeroing its
 * line box is not opting into the title ramp.
 */
const LINE_HEIGHT_RESET = /^(0|1)$/;

/**
 * SVG primitives. A component rendering nothing but these is a glyph module
 * whose colour and size come from the consuming container, so it owes no
 * stylesheet of its own.
 */
const SVG_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "title",
  "desc",
  "mask",
  "clipPath",
  "pattern",
  "marker",
  "image",
  "foreignObject",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
]);

type Token = { name: string; value: string };

type Hit = { file: string; line: number; text: string };

type RawValue = Hit & { property: string; value: string; token: string };

type Declaration = Hit & { property: string; value: string };

type StyleSource =
  /** Has its own `Name.module.scss`. */
  | { kind: "own" }
  /** No own stylesheet; the TSX imports another module's. */
  | { kind: "shared"; from: readonly string[] }
  /** Renders no styleable markup of its own, so it owes no stylesheet. */
  | { kind: "exempt"; reason: string }
  /** Renders its own markup with no stylesheet anywhere. */
  | { kind: "none" };

type BarrelState = "ok" | "missing" | "empty";

type ComponentReport = {
  name: string;
  missingFiles: readonly string[];
  barrel: BarrelState;
  styles: StyleSource;
  hasTest: boolean;
  rawValues: readonly RawValue[];
  flex: readonly Hit[];
  margins: readonly Hit[];
  unclassedDivs: readonly Hit[];
};

/** Blanks out matches while preserving offsets, so line numbers stay true. */
function blank({
  source,
  pattern,
}: {
  source: string;
  pattern: RegExp;
}): string {
  return source.replace(pattern, (match) => match.replace(/[^\n]/g, " "));
}

/** Drops `//` and `/* *\/` comments so commented-out CSS is never reported. */
function stripComments({ source }: { source: string }): string {
  const blocks = blank({ source, pattern: /\/\*[\s\S]*?\*\// });
  return blank({ source: blocks, pattern: /(^|[^:])\/\/[^\n]*/gm });
}

/**
 * Blanks `url(...)`, whose data URIs carry `;` and would otherwise split a
 * declaration in half.
 */
function stripUrls({ source }: { source: string }): string {
  return blank({ source, pattern: /url\((?:[^()]|\([^()]*\))*\)/g });
}

/** The `:root { ... }` block of `styles/globals.scss`, matched by brace depth. */
function rootBlock({ source }: { source: string }): string {
  const open = source.indexOf("{", source.indexOf(":root"));
  if (open < 0) return "";
  const { end } = source
    .slice(open)
    .split("")
    .reduce<{ depth: number; end: number }>(
      (state, character, index) => {
        if (state.end >= 0) return state;
        if (character === "{") return { ...state, depth: state.depth + 1 };
        if (character !== "}") return state;
        const depth = state.depth - 1;
        return depth === 0 ? { depth, end: index } : { ...state, depth };
      },
      { depth: 0, end: -1 },
    );
  return end < 0 ? "" : source.slice(open + 1, open + end);
}

/** `rgba(200, 162, 74, .20)` and `RGBA(200,162,74,0.2)` compare equal. */
function normalizeValue({ value }: { value: string }): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*,\s*/g, ",")
    .replace(/(?<![\w.])(\d*\.?\d+)/g, (match) =>
      String(Number.parseFloat(match)),
    );
}

/** `#fff` and `#FFFFFF` compare equal. */
function normalizeColor({ value }: { value: string }): string {
  const lower = value.toLowerCase();
  if (!lower.startsWith("#")) return normalizeValue({ value: lower });
  const digits = lower.slice(1);
  return digits.length === 3 || digits.length === 4
    ? `#${digits.replace(/./g, (digit) => `${digit}${digit}`)}`
    : lower;
}

async function readTokens(): Promise<readonly Token[]> {
  const file = await fs.readFile(TOKENS_FILE, "utf-8");
  const block = rootBlock({ source: stripComments({ source: file }) });
  return [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((match) => ({
    name: match[1] ?? "",
    value: (match[2] ?? "").trim(),
  }));
}

async function readIfPresent({
  file,
}: {
  file: string;
}): Promise<string | null> {
  return fs.readFile(file, "utf-8").catch(() => null);
}

/** Every `property: value;` declaration in a stylesheet, with its line number. */
function parseDeclarations({
  source,
  file,
}: {
  source: string;
  file: string;
}): readonly Declaration[] {
  const clean = stripUrls({ source: stripComments({ source }) });
  return [...clean.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].flatMap((match) => {
    const property = match[1] ?? "";
    if (property.startsWith("--")) return [];
    const value = (match[2] ?? "").replace(/\s+/g, " ").trim();
    return [
      {
        file,
        line: clean.slice(0, match.index ?? 0).split("\n").length,
        property,
        value,
        text: `${property}: ${value};`,
      },
    ];
  });
}

/** Every color literal written into a declaration value. */
function colorLiterals({ value }: { value: string }): readonly string[] {
  return [
    ...[...value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((match) => match[0]),
    ...[...value.matchAll(/\brgba?\([^)]*\)/g)].map((match) => match[0]),
  ];
}

function findRawValues({
  source,
  file,
  tokens,
}: {
  source: string;
  file: string;
  tokens: readonly Token[];
}): readonly RawValue[] {
  const byColor = new Map(
    tokens
      .filter((token) => /^(#|rgba?\()/i.test(token.value))
      .map((token) => [normalizeColor({ value: token.value }), token.name]),
  );

  return parseDeclarations({ source, file }).flatMap((declaration) => {
    const { property, value, line, text } = declaration;

    const allowed = (token: string) =>
      ROLE_GUARDS.every(
        (guard) => !guard.token.test(token) || guard.property.test(property),
      );

    const colors = colorLiterals({ value }).flatMap((literal) => {
      const token = byColor.get(normalizeColor({ value: literal }));
      return token !== undefined && allowed(token)
        ? [{ file, line, text, property, value: literal, token }]
        : [];
    });

    const reset = property === "line-height" && LINE_HEIGHT_RESET.test(value);
    const family = LENGTH_FAMILIES.find((entry) =>
      entry.property.test(property),
    );
    const lengths = (family && !reset ? tokens : [])
      .filter(
        (token) =>
          (family?.token.test(token.name) ?? false) &&
          allowed(token.name) &&
          normalizeValue({ value: token.value }) === normalizeValue({ value }),
      )
      .map((token) => ({
        file,
        line,
        text,
        property,
        value,
        token: token.name,
      }));

    return [...colors, ...lengths];
  });
}

function findFlex({
  source,
  file,
}: {
  source: string;
  file: string;
}): readonly Hit[] {
  return parseDeclarations({ source, file })
    .filter(
      (declaration) =>
        declaration.property === "display" &&
        /^(inline-)?flex$/.test(declaration.value),
    )
    .map(({ line, text }) => ({ file, line, text }));
}

function findSpacingMargins({
  source,
  file,
}: {
  source: string;
  file: string;
}): readonly Hit[] {
  return parseDeclarations({ source, file })
    .filter(
      (declaration) =>
        MARGIN_PROPERTY.test(declaration.property) &&
        !MARGIN_RESET.test(declaration.value),
    )
    .map(({ line, text }) => ({ file, line, text }));
}

/**
 * A `<div>` whose attribute list carries neither `className` nor `id`. The
 * attribute list is walked rather than regexed because JSX attributes nest
 * braces, strings, and `>` characters (`onClick={() => x > 1}`), any of which
 * would end a naive match early.
 */
function findUnclassedDivs({
  source,
  file,
}: {
  source: string;
  file: string;
}): readonly Hit[] {
  return [...source.matchAll(/<div(?=[\s/>])/g)].flatMap((open) => {
    const start = (open.index ?? 0) + 4;
    const { at } = source
      .slice(start)
      .split("")
      .reduce<{ depth: number; quote: string | null; at: number }>(
        (state, character, index) => {
          if (state.at >= 0) return state;
          if (state.quote !== null) {
            return character === state.quote
              ? { ...state, quote: null }
              : state;
          }
          if (character === '"' || character === "'" || character === "`") {
            return { ...state, quote: character };
          }
          if (character === "{") return { ...state, depth: state.depth + 1 };
          if (character === "}") return { ...state, depth: state.depth - 1 };
          if (character === ">" && state.depth === 0)
            return { ...state, at: index };
          return state;
        },
        { depth: 0, quote: null, at: -1 },
      );
    if (at < 0) return [];
    const attributes = source.slice(start, start + at);
    if (/\bclassName\b/.test(attributes) || /\bid\s*=/.test(attributes))
      return [];
    return [
      {
        file,
        line: source.slice(0, open.index ?? 0).split("\n").length,
        text: `<div${attributes.replace(/\s+/g, " ").trimEnd()}>`,
      },
    ];
  });
}

/** Lowercase JSX tag names rendered by a source file, i.e. host elements. */
function intrinsicTags({ source }: { source: string }): ReadonlySet<string> {
  return new Set(
    [...source.matchAll(/<([a-z][a-zA-Z0-9]*)(?=[\s/>])/g)].map(
      (match) => match[1] ?? "",
    ),
  );
}

/**
 * Why a component with no `Name.module.scss` may still be conformant: it either
 * renders only other components (a composition wrapper) or only SVG primitives
 * (a glyph module). Anything else genuinely owes a stylesheet.
 */
function styleExemption({ source }: { source: string }): string | null {
  const tags = intrinsicTags({ source });
  if (tags.size === 0) return "composition only, renders no host elements";
  return [...tags].every((tag) => SVG_TAGS.has(tag))
    ? "glyph module, renders only SVG primitives"
    : null;
}

async function auditComponent({
  name,
  tokens,
}: {
  name: string;
  tokens: readonly Token[];
}): Promise<ComponentReport> {
  const dir = path.join(COMPONENTS_DIR, name);
  const relative = (file: string) => path.relative(ROOT, file);
  const stylesFile = path.join(dir, `${name}.module.scss`);

  const [component, ownStyles, barrel, entries] = await Promise.all([
    readIfPresent({ file: path.join(dir, `${name}.tsx`) }),
    readIfPresent({ file: stylesFile }),
    readIfPresent({ file: path.join(dir, "index.ts") }),
    fs.readdir(dir),
  ]);

  const hasTest = entries.includes(`${name}.test.tsx`);
  const barrelState: BarrelState =
    barrel === null ? "missing" : /\bexport\b/.test(barrel) ? "ok" : "empty";

  const imported = [
    ...(component ?? "").matchAll(/from\s+"([^"]+\.module\.scss)"/g),
  ].map((match) => match[1] ?? "");

  const exemption = styleExemption({ source: component ?? "" });
  const styles: StyleSource =
    ownStyles !== null
      ? { kind: "own" }
      : imported.length > 0
        ? { kind: "shared", from: imported }
        : exemption !== null
          ? { kind: "exempt", reason: exemption }
          : { kind: "none" };

  const missingFiles = [
    component === null ? `${name}.tsx` : null,
    styles.kind === "none" ? `${name}.module.scss` : null,
    barrel === null ? "index.ts" : null,
    hasTest ? null : `${name}.test.tsx`,
  ].filter((entry): entry is string => entry !== null);

  const styleHits =
    ownStyles === null
      ? { rawValues: [], flex: [], margins: [] }
      : {
          rawValues: findRawValues({
            source: ownStyles,
            file: relative(stylesFile),
            tokens,
          }),
          flex: findFlex({ source: ownStyles, file: relative(stylesFile) }),
          margins: findSpacingMargins({
            source: ownStyles,
            file: relative(stylesFile),
          }),
        };

  const unclassedDivs = (
    await Promise.all(
      entries
        .filter(
          (entry) => entry.endsWith(".tsx") && !entry.endsWith(".test.tsx"),
        )
        .map(async (entry) => {
          const file = path.join(dir, entry);
          return findUnclassedDivs({
            source: await fs.readFile(file, "utf-8"),
            file: relative(file),
          });
        }),
    )
  ).flat();

  return {
    name,
    missingFiles,
    barrel: barrelState,
    styles,
    hasTest,
    ...styleHits,
    unclassedDivs,
  };
}

/**
 * Stylesheets sitting at `components/` root rather than inside a component
 * directory. Several components share them, so they carry no four-file
 * obligation, but the CSS rules still apply.
 */
async function auditSharedStylesheets({
  tokens,
}: {
  tokens: readonly Token[];
}): Promise<readonly ComponentReport[]> {
  const entries = await fs.readdir(COMPONENTS_DIR, { withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".module.scss"))
      .map(async (entry) => {
        const file = path.join(COMPONENTS_DIR, entry.name);
        const relative = path.relative(ROOT, file);
        const source = await fs.readFile(file, "utf-8");
        return {
          name: `${entry.name} (shared)`,
          missingFiles: [],
          barrel: "ok" as const,
          styles: { kind: "own" as const },
          hasTest: true,
          rawValues: findRawValues({ source, file: relative, tokens }),
          flex: findFlex({ source, file: relative }),
          margins: findSpacingMargins({ source, file: relative }),
          unclassedDivs: [],
        };
      }),
  );
}

function findingCount({ report }: { report: ComponentReport }): number {
  return (
    report.missingFiles.length +
    (report.barrel === "ok" ? 0 : 1) +
    report.rawValues.length +
    report.flex.length +
    report.margins.length +
    report.unclassedDivs.length
  );
}

const json = Bun.argv.includes("--json");

const tokens = await readTokens();
const names = (await fs.readdir(COMPONENTS_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const [components, shared] = await Promise.all([
  Promise.all(names.map((name) => auditComponent({ name, tokens }))),
  auditSharedStylesheets({ tokens }),
]);

const reports = [...components, ...shared];
const flagged = reports.filter((report) => findingCount({ report }) > 0);
const sum = (pick: (report: ComponentReport) => number) =>
  reports.reduce((total, report) => total + pick(report), 0);

const totals = {
  components: components.length,
  conformant: components.filter((report) => findingCount({ report }) === 0)
    .length,
  sharedStylesheets: shared.length,
  tokens: tokens.length,
  missingTests: components.filter((report) => !report.hasTest).length,
  missingBarrels: components.filter((report) => report.barrel !== "ok").length,
  rawValues: sum((report) => report.rawValues.length),
  flex: sum((report) => report.flex.length),
  margins: sum((report) => report.margins.length),
  unclassedDivs: sum((report) => report.unclassedDivs.length),
};

if (json) {
  console.log(JSON.stringify({ totals, reports: flagged }, null, 2));
} else {
  const section = ({
    title,
    lines,
  }: {
    title: string;
    lines: readonly string[];
  }) => {
    console.log(`\n${title} (${lines.length})`);
    console.log(lines.length === 0 ? "  none" : lines.join("\n"));
  };

  section({
    title: "MISSING FILES",
    lines: components
      .filter((report) => report.missingFiles.length > 0)
      .map((report) => `  ${report.name}: ${report.missingFiles.join(", ")}`),
  });

  section({
    title: "BARRELS",
    lines: components
      .filter((report) => report.barrel !== "ok")
      .map((report) => `  ${report.name}: index.ts ${report.barrel}`),
  });

  section({
    title: "NO CO-LOCATED TEST",
    lines: components
      .filter((report) => !report.hasTest)
      .map((report) => `  ${report.name}`),
  });

  section({
    title: "RAW VALUES WITH AN EXACT TOKEN",
    lines: reports.flatMap((report) =>
      report.rawValues.map(
        (hit) =>
          `  ${hit.file}:${hit.line}  ${hit.property}: ${hit.value}  ->  var(${hit.token})`,
      ),
    ),
  });

  section({
    title: "DISPLAY FLEX (grid is the default)",
    lines: reports.flatMap((report) =>
      report.flex.map((hit) => `  ${hit.file}:${hit.line}  ${hit.text}`),
    ),
  });

  section({
    title: "MARGIN USED FOR SPACING",
    lines: reports.flatMap((report) =>
      report.margins.map((hit) => `  ${hit.file}:${hit.line}  ${hit.text}`),
    ),
  });

  section({
    title: "UNCLASSED DIVS",
    lines: reports.flatMap((report) =>
      report.unclassedDivs.map(
        (hit) => `  ${hit.file}:${hit.line}  ${hit.text}`,
      ),
    ),
  });

  section({
    title: "NO OWN STYLESHEET (advisory, conformant)",
    lines: components.flatMap((report) => {
      if (report.styles.kind === "shared") {
        return [`  ${report.name}: shares ${report.styles.from.join(", ")}`];
      }
      return report.styles.kind === "exempt"
        ? [`  ${report.name}: exempt, ${report.styles.reason}`]
        : [];
    }),
  });

  console.log(
    `\n${totals.conformant}/${totals.components} components clean, ` +
      `${totals.tokens} tokens parsed from styles/globals.scss, ` +
      `${totals.sharedStylesheets} shared stylesheet(s) audited`,
  );
}

process.exit(flagged.length === 0 ? 0 : 1);
