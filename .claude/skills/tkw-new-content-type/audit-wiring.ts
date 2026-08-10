/**
 * Audits every collection in `content/` against the touchpoints that wire a
 * collection into the site: schema, loaders, both routes, nav, glyphs, and the
 * content-integrity checks.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-new-content-type/audit-wiring.ts
 *   bun .claude/skills/tkw-new-content-type/audit-wiring.ts --json
 *
 * Read-only. It writes nothing and edits nothing. It exits 1 when a required
 * touchpoint is missing, so it can gate a half-wired collection.
 *
 * Collections are discovered from `content/`, not from a list in this file, so
 * a new directory is audited the moment its first markdown file lands. Only an
 * irregular plural needs an entry below.
 *
 * Most probes are textual. The wiring they check lives in object literals and
 * JSX that no module exports, so importing the modules would reveal less than
 * reading them. Where a table *is* exported (`sectionGlyphs`, `NAV_ITEMS`) the
 * probe still reads the source, because the audit has to run against a tree
 * that may not typecheck yet.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

/** Plurals that `slice(0, -1)` gets wrong. Empty while every name is regular. */
const IRREGULAR_SINGULARS: Record<string, string> = {};

const SHARED_SOURCES = [
  "lib/schemas.ts",
  "lib/content.ts",
  "lib/nav.ts",
  "lib/content-integrity.ts",
  "lib/content-integrity.test.ts",
  "components/SectionGlyphs/SectionGlyphs.tsx",
  "components/MainMenu/MainMenu.tsx",
  "components/SiteMenu/SiteMenu.tsx",
];

type Collection = {
  /** Directory name and route segment, e.g. `events`. */
  name: string;
  /** Singular form, e.g. `event`. */
  singular: string;
  /** Pascal-case singular used by schemas and components, e.g. `Event`. */
  pascalSingular: string;
  /** Pascal-case plural used by `loadAll*`, e.g. `Events`. */
  pascalPlural: string;
  /** Markdown files on disk. */
  entries: number;
};

type NavEntry = { href: string; label: string; visible: boolean };

type Ctx = {
  collection: Collection;
  /** Contents of a repo-relative text file, or `""` when it is absent. */
  text: (relative: string) => string;
  /** Whether a repo-relative path exists on disk. */
  has: (relative: string) => boolean;
  navEntries: readonly NavEntry[];
  /** The `"castles" | "houses" | ...` union `loadFile`/`loadAll` accept. */
  loaderUnion: ReadonlySet<string>;
};

type Check = {
  id: string;
  /** `required` gaps fail the audit; `variant` gaps are reported as context. */
  tier: "required" | "variant";
  /** The file the touchpoint lives in, for the gap report. */
  where: (collection: Collection) => string;
  /** What has to be added there. */
  expects: string;
  test: (ctx: Ctx) => boolean;
};

const pascal = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const indexRoute = (c: Collection) => `app/${c.name}/page.tsx`;
const detailRoute = (c: Collection) => `app/${c.name}/[slug]/page.tsx`;
const indexStyles = (c: Collection) => `app/${c.name}/page.module.scss`;
const filteredList = (c: Collection) =>
  `components/Filtered${c.pascalSingular}List`;
const infobox = (c: Collection) => `components/${c.pascalSingular}Infobox`;

const CHECKS: Check[] = [
  {
    id: "content-dir",
    tier: "required",
    where: (c) => `content/${c.name}/`,
    expects: "at least one markdown entry",
    test: ({ collection }) => collection.entries > 0,
  },
  {
    id: "schema",
    tier: "required",
    where: () => "lib/schemas.ts",
    expects: "export const <Name>Schema = z.object({ ... })",
    test: ({ collection, text }) =>
      text("lib/schemas.ts").includes(
        `export const ${collection.pascalSingular}Schema`,
      ),
  },
  {
    id: "schema-type",
    tier: "required",
    where: () => "lib/schemas.ts",
    expects: "export type <Name> = z.infer<typeof <Name>Schema>",
    test: ({ collection, text }) =>
      text("lib/schemas.ts").includes(
        `export type ${collection.pascalSingular} =`,
      ),
  },
  {
    id: "loader-union",
    tier: "required",
    where: () => "lib/content.ts",
    expects: "the collection name in both loadFile/loadAll `type` unions",
    test: ({ collection, loaderUnion }) => loaderUnion.has(collection.name),
  },
  {
    id: "loader-one",
    tier: "required",
    where: () => "lib/content.ts",
    expects: "export const load<Name> = (slug: string) => loadFile(...)",
    test: ({ collection, text }) =>
      text("lib/content.ts").includes(
        `export const load${collection.pascalSingular} =`,
      ),
  },
  {
    id: "loader-all",
    tier: "required",
    where: () => "lib/content.ts",
    expects: "export const loadAll<Names> = () => loadAll(...)",
    test: ({ collection, text }) =>
      text("lib/content.ts").includes(
        `export const loadAll${collection.pascalPlural} =`,
      ),
  },
  {
    id: "detail-route",
    tier: "required",
    where: detailRoute,
    expects: "the per-entry page",
    test: ({ collection, has }) => has(detailRoute(collection)),
  },
  {
    id: "detail-static-params",
    tier: "required",
    where: detailRoute,
    expects: "export async function generateStaticParams()",
    test: ({ collection, text }) =>
      text(detailRoute(collection)).includes("generateStaticParams"),
  },
  {
    id: "detail-metadata",
    tier: "required",
    where: detailRoute,
    expects: "export async function generateMetadata()",
    test: ({ collection, text }) =>
      text(detailRoute(collection)).includes("generateMetadata"),
  },
  {
    id: "index-route",
    tier: "required",
    where: indexRoute,
    expects: "the browse page for the collection",
    test: ({ collection, has }) => has(indexRoute(collection)),
  },
  {
    id: "index-metadata",
    tier: "required",
    where: indexRoute,
    expects: "export const metadata: Metadata = { title, description }",
    test: ({ collection, text }) =>
      text(indexRoute(collection)).includes("export const metadata"),
  },
  {
    id: "index-plate",
    tier: "required",
    where: indexRoute,
    expects: "<PlateLayout> as the page shell",
    test: ({ collection, text }) =>
      text(indexRoute(collection)).includes("<PlateLayout>"),
  },
  {
    id: "index-heading",
    tier: "required",
    where: indexRoute,
    expects: '<PageHeading title eyebrow="Collection NN" icon subtitle />',
    test: ({ collection, text }) => {
      const source = text(indexRoute(collection));
      return (
        source.includes("<PageHeading") &&
        /eyebrow="Collection \d\d"/.test(source)
      );
    },
  },
  {
    id: "index-glyph",
    tier: "required",
    where: indexRoute,
    expects: "icon={sectionGlyphs.<name>}",
    test: ({ collection, text }) =>
      text(indexRoute(collection)).includes(`sectionGlyphs.${collection.name}`),
  },
  {
    id: "index-list",
    tier: "required",
    where: indexRoute,
    expects:
      "a browse list: <Filtered<Name>List> or an inline list on page.module.scss",
    test: ({ collection, text }) => {
      const source = text(indexRoute(collection));
      return (
        source.includes(`Filtered${collection.pascalSingular}List`) ||
        source.includes(`@/app/${collection.name}/page.module.scss`)
      );
    },
  },
  {
    id: "glyph",
    tier: "required",
    where: () => "components/SectionGlyphs/SectionGlyphs.tsx",
    expects: "a 32x32 currentColor glyph keyed by the collection name",
    test: ({ collection, text }) =>
      new RegExp(`^\\s{2}${collection.name}: `, "m").test(
        text("components/SectionGlyphs/SectionGlyphs.tsx"),
      ),
  },
  {
    id: "nav",
    tier: "required",
    where: () => "lib/nav.ts",
    expects: '{ href: "/<name>/", label, visible } in NAV_ITEMS',
    test: ({ collection, navEntries }) =>
      navEntries.some((entry) => entry.href === `/${collection.name}/`),
  },
  {
    id: "home-tile",
    tier: "required",
    where: () => "components/MainMenu/MainMenu.tsx",
    expects: '<MainMenuTile href="/<name>/" plate="NN" />',
    test: ({ collection, text }) =>
      text("components/MainMenu/MainMenu.tsx").includes(
        `href="/${collection.name}/"`,
      ),
  },
  {
    id: "drawer-art",
    tier: "required",
    where: () => "components/SiteMenu/SiteMenu.tsx",
    expects: 'an ART entry: "/<name>/": { icon } or { icon, glyph }',
    test: ({ collection, text }) =>
      text("components/SiteMenu/SiteMenu.tsx").includes(
        `"/${collection.name}/":`,
      ),
  },
  {
    id: "integrity-collection",
    tier: "required",
    where: () => "lib/content-integrity.ts",
    expects: "a key on the Collections type",
    test: ({ collection, text }) =>
      new RegExp(
        `${collection.name}: Awaited<ReturnType<typeof loadAll${collection.pascalPlural}>>`,
      ).test(text("lib/content-integrity.ts")),
  },
  {
    id: "integrity-slugs",
    tier: "required",
    where: () => "lib/content-integrity.ts",
    expects: "a slug set in buildSlugSets, so `mentions` can resolve here",
    test: ({ collection, text }) =>
      new RegExp(`${collection.name}: new Set\\(`).test(
        text("lib/content-integrity.ts"),
      ),
  },
  {
    id: "integrity-refs",
    tier: "required",
    where: () => "lib/content-integrity.ts",
    expects: "a walk over the entries that validates every slug-bearing field",
    test: ({ collection, text }) =>
      new RegExp(
        `collections\\.${collection.name}\\.forEach|\\.\\.\\.collections\\.${collection.name}[,\\s\\]]`,
      ).test(text("lib/content-integrity.ts")),
  },
  {
    id: "integrity-test",
    tier: "required",
    where: () => "lib/content-integrity.test.ts",
    expects: "loadAll<Names>() in the Promise.all the suite feeds the checks",
    test: ({ collection, text }) =>
      text("lib/content-integrity.test.ts").includes(
        `loadAll${collection.pascalPlural}()`,
      ),
  },
  {
    id: "nav-visible",
    tier: "variant",
    where: () => "lib/nav.ts",
    expects: "visible: true, so the header rail and drawer link the section",
    test: ({ collection, navEntries }) =>
      navEntries.some(
        (entry) => entry.href === `/${collection.name}/` && entry.visible,
      ),
  },
  {
    id: "filtered-list",
    tier: "variant",
    where: filteredList,
    expects:
      "a debounced ?search= client list (the alternative is a static list)",
    test: ({ collection, has }) =>
      has(
        `${filteredList(collection)}/Filtered${collection.pascalSingular}List.tsx`,
      ),
  },
  {
    id: "index-scss",
    tier: "variant",
    where: indexStyles,
    expects:
      "styles for an inline list (absent when a Filtered*List owns them)",
    test: ({ collection, has }) => has(indexStyles(collection)),
  },
  {
    id: "infobox",
    tier: "variant",
    where: infobox,
    expects: "a summary aside on the detail page",
    test: ({ collection, has }) =>
      has(`${infobox(collection)}/${collection.pascalSingular}Infobox.tsx`),
  },
  {
    id: "detail-back-link",
    tier: "variant",
    where: detailRoute,
    expects: '<Link href="/<name>/">← All <Names></Link>',
    test: ({ collection, text }) =>
      text(detailRoute(collection)).includes(`href="/${collection.name}/"`),
  },
  {
    id: "prose-links",
    tier: "variant",
    where: detailRoute,
    expects: "buildProseLinkIndex, so bodies auto-link to other entries",
    test: ({ collection, text }) =>
      text(detailRoute(collection)).includes("buildProseLinkIndex"),
  },
  {
    id: "menu-icon",
    tier: "variant",
    where: (c) => `public/menu-icons/${c.name}.png`,
    expects: "drawer art (the alternative is a SectionGlyphs glyph)",
    test: ({ collection, has }) =>
      has(`public/menu-icons/${collection.name}.png`),
  },
];

async function readText(relative: string): Promise<[string, string]> {
  const contents = await fs
    .readFile(path.join(ROOT, relative), "utf-8")
    .catch(() => "");
  return [relative, contents];
}

async function pathExists(relative: string): Promise<[string, boolean]> {
  const found = await fs
    .stat(path.join(ROOT, relative))
    .then(() => true)
    .catch(() => false);
  return [relative, found];
}

async function discoverCollections(): Promise<Collection[]> {
  const contentRoot = path.join(ROOT, "content");
  const dirents = await fs
    .readdir(contentRoot, { withFileTypes: true })
    .catch(() => []);
  const named = await Promise.all(
    dirents
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<Collection> => {
        const files = await fs.readdir(path.join(contentRoot, entry.name));
        const singular =
          IRREGULAR_SINGULARS[entry.name] ?? entry.name.replace(/s$/, "");
        return {
          name: entry.name,
          singular,
          pascalSingular: pascal(singular),
          pascalPlural: pascal(entry.name),
          entries: files.filter((file) => file.endsWith(".md")).length,
        };
      }),
  );
  return named.sort((a, b) => a.name.localeCompare(b.name));
}

function parseNavEntries(source: string): NavEntry[] {
  const matches = source.matchAll(
    /\{\s*href:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*visible:\s*(true|false)\s*\}/g,
  );
  return [...matches].map((match) => ({
    href: match[1],
    label: match[2],
    visible: match[3] === "true",
  }));
}

/** The `"castles" | "houses" | ...` union `loadFile` and `loadAll` accept. */
function parseLoaderUnion(source: string): Set<string> {
  const matches = source.matchAll(/^\s*\|\s*"([a-z-]+)",?$/gm);
  return new Set([...matches].map((match) => match[1]));
}

const collections = await discoverCollections();

const perCollectionPaths = collections.flatMap((collection) => [
  indexRoute(collection),
  detailRoute(collection),
  indexStyles(collection),
  `${filteredList(collection)}/Filtered${collection.pascalSingular}List.tsx`,
  `${infobox(collection)}/${collection.pascalSingular}Infobox.tsx`,
  `public/menu-icons/${collection.name}.png`,
]);

const [textEntries, existEntries] = await Promise.all([
  Promise.all(
    [...SHARED_SOURCES, ...perCollectionPaths].map((relative) =>
      readText(relative),
    ),
  ),
  Promise.all(perCollectionPaths.map((relative) => pathExists(relative))),
]);

const sources = new Map(textEntries);
const present = new Map(existEntries);

const text = (relative: string) => sources.get(relative) ?? "";
const has = (relative: string) => present.get(relative) ?? false;

const navEntries = parseNavEntries(text("lib/nav.ts"));
const loaderUnion = parseLoaderUnion(text("lib/content.ts"));

type Result = {
  id: string;
  tier: Check["tier"];
  ok: boolean;
  where: string;
  expects: string;
};

const report = collections.map((collection) => {
  const ctx: Ctx = { collection, text, has, navEntries, loaderUnion };
  const results: Result[] = CHECKS.map((check) => ({
    id: check.id,
    tier: check.tier,
    ok: check.test(ctx),
    where: check.where(collection),
    expects: check.expects,
  }));
  const required = results.filter((result) => result.tier === "required");
  return {
    name: collection.name,
    entries: collection.entries,
    passed: required.filter((result) => result.ok).length,
    total: required.length,
    missing: required.filter((result) => !result.ok),
    variants: results.filter((result) => result.tier === "variant"),
  };
});

const gapCount = report.reduce(
  (total, entry) => total + entry.missing.length,
  0,
);

if (Bun.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        gaps: gapCount,
        collections: report.map((entry) => ({
          name: entry.name,
          entries: entry.entries,
          required: { passed: entry.passed, total: entry.total },
          missing: entry.missing.map(({ id, where, expects }) => ({
            id,
            where,
            expects,
          })),
          variants: entry.variants.reduce<Record<string, boolean>>(
            (acc, variant) => ({ ...acc, [variant.id]: variant.ok }),
            {},
          ),
        })),
      },
      null,
      2,
    ),
  );
} else {
  const requiredCount = CHECKS.filter(
    (check) => check.tier === "required",
  ).length;
  const variantIds = CHECKS.filter((check) => check.tier === "variant").map(
    (check) => check.id,
  );
  const pad = (value: string, width: number) => value.padEnd(width);
  const nameWidth = Math.max(
    10,
    ...report.map((entry) => entry.name.length + 2),
  );

  console.log(
    `REQUIRED TOUCHPOINTS (${requiredCount} per collection, ${collections.length} collections)\n`,
  );
  console.log(
    `${pad("COLLECTION", nameWidth)}${pad("ENTRIES", 9)}${pad("REQUIRED", 10)}MISSING`,
  );
  report.forEach((entry) => {
    const summary =
      entry.missing.length === 0
        ? "-"
        : entry.missing.map((result) => result.id).join(", ");
    console.log(
      `${pad(entry.name, nameWidth)}${pad(String(entry.entries), 9)}${pad(
        `${entry.passed}/${entry.total}`,
        10,
      )}${summary}`,
    );
  });

  console.log(`\nGAPS (${gapCount})`);
  if (gapCount === 0) {
    console.log("  none");
  } else {
    report
      .filter((entry) => entry.missing.length > 0)
      .forEach((entry) => {
        console.log(`  ${entry.name}`);
        entry.missing.forEach((result) => {
          console.log(`    ${pad(result.id, 22)}${result.where}`);
          console.log(`    ${pad("", 22)}add: ${result.expects}`);
        });
      });
  }

  console.log(`\nVARIANT TOUCHPOINTS (not required, shown for shape)\n`);
  const variantWidth = Math.max(...variantIds.map((id) => id.length)) + 2;
  console.log(
    `${pad("VARIANT", variantWidth)}${report
      .map((entry) => pad(entry.name.slice(0, 10), 12))
      .join("")}`,
  );
  variantIds.forEach((id) => {
    const cells = report
      .map((entry) => {
        const hit = entry.variants.find((variant) => variant.id === id);
        return pad(hit?.ok ? "yes" : "-", 12);
      })
      .join("");
    console.log(`${pad(id, variantWidth)}${cells}`);
  });
}

if (gapCount > 0) process.exitCode = 1;
