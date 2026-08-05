/**
 * Audits `public/` in both directions:
 *
 *   DEAD      a file on disk that nothing can resolve to
 *   BROKEN    a path referenced in source with no file on disk
 *   HEAVY     a resolved file well above the size its render calls for
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-image-optimize/audit-assets.ts
 *   bun .claude/skills/tkw-image-optimize/audit-assets.ts --json
 *
 * Read-only. Deletes and re-encodes nothing.
 *
 * Sigils are deliberately out of scope: `lib/sigil-integrity.ts` already owns
 * that resolution order and is gated in CI. See the `tkw-sigil-audit` skill.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  loadAllBattles,
  loadAllCharacters,
  loadAllWeapons,
} from "@/lib/content";

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const SOURCE_ROOTS = ["app", "components", "lib", "styles"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".scss", ".css", ".json"]);
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
]);

/** Directories whose files resolve by content slug through a filesystem probe. */
const SLUG_RESOLVED = new Set(["characters", "battles", "weapons"]);
/** Owned by `lib/sigil-integrity.ts`; auditing it here would fork the rules. */
const DELEGATED = new Set(["sigils"]);

/**
 * The portrait fallback pool. `findPortrait` in `lib/portraits.ts` hashes a
 * slug into `unknown-<sex>-<NN>.jpg` when a character has no dedicated art, so
 * these files are reachable without ever appearing as a literal.
 */
const GENERATED_ASSETS = [/^characters\/unknown-(male|female)-\d{2}$/];

/** Bytes above which a resolved image is worth re-encoding. */
const HEAVY_BYTES = 200_000;

type Asset = {
  /** Path as the browser sees it, e.g. `/menu-icons/map.png`. */
  href: string;
  absolute: string;
  dir: string;
  stem: string;
  bytes: number;
};

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.startsWith(".") ? [] : [full];
    }),
  );
  return nested.flat();
}

async function collectAssets(): Promise<Asset[]> {
  const files = await walk(PUBLIC_ROOT);
  const stats = await Promise.all(
    files
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .map(async (file) => {
        const relative = path.relative(PUBLIC_ROOT, file);
        const { size } = await fs.stat(file);
        const dirname = path.dirname(relative);
        return {
          href: `/${relative}`,
          absolute: file,
          dir: dirname === "." ? "" : dirname,
          stem: path.basename(relative, path.extname(relative)),
          bytes: size,
        };
      }),
  );
  return stats;
}

async function readSources(): Promise<string> {
  const perRoot = await Promise.all(
    SOURCE_ROOTS.map(async (root) => {
      const dir = path.join(process.cwd(), root);
      const exists = await fs
        .access(dir)
        .then(() => true)
        .catch(() => false);
      if (!exists) return [];
      const files = await walk(dir);
      // Test files cite fixture paths like `/characters/foo.jpeg` that were
      // never meant to exist on disk. Counting them produces phantom
      // references in both directions.
      return files.filter(
        (file) =>
          SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()) &&
          !/\.test\.(ts|tsx)$/.test(file),
      );
    }),
  );
  const contents = await Promise.all(
    perRoot.flat().map((file) => fs.readFile(file, "utf-8")),
  );
  return contents.join("\n");
}

/** Every `/dir/file.ext` image path written as a literal anywhere in source. */
function literalImageReferences(source: string): Set<string> {
  const matches = source.matchAll(
    /["'`](\/[A-Za-z0-9._\-/]+\.(?:png|jpe?g|webp|avif|gif|svg))["'`]/g,
  );
  return new Set([...matches].map((match) => match[1]));
}

const json = Bun.argv.includes("--json");

const [assets, source, characters, battles, weapons] = await Promise.all([
  collectAssets(),
  readSources(),
  loadAllCharacters(),
  loadAllBattles(),
  loadAllWeapons(),
]);

const literals = literalImageReferences(source);

const slugSets: Record<string, ReadonlySet<string>> = {
  characters: new Set(characters.map((entry) => entry.frontmatter.slug)),
  battles: new Set(battles.map((entry) => entry.frontmatter.slug)),
  weapons: new Set(weapons.map((entry) => entry.frontmatter.slug)),
};

const audited = assets.filter((asset) => !DELEGATED.has(asset.dir));

const dead = audited.filter((asset) => {
  if (literals.has(asset.href)) return false;
  const key = asset.dir ? `${asset.dir}/${asset.stem}` : asset.stem;
  if (GENERATED_ASSETS.some((pattern) => pattern.test(key))) return false;
  if (SLUG_RESOLVED.has(asset.dir)) {
    return !(slugSets[asset.dir]?.has(asset.stem) ?? false);
  }
  // Unmanaged directories resolve only by literal path.
  return true;
});

const onDisk = new Set(assets.map((asset) => asset.href));
const broken = [...literals].filter((href) => !onDisk.has(href));

const heavy = audited
  .filter((asset) => !dead.includes(asset) && asset.bytes > HEAVY_BYTES)
  .sort((a, b) => b.bytes - a.bytes);

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)}MB`;
const kb = (bytes: number) => `${Math.round(bytes / 1000)}KB`;
const deadBytes = dead.reduce((total, asset) => total + asset.bytes, 0);

if (json) {
  console.log(
    JSON.stringify(
      {
        dead: dead.map(({ href, bytes }) => ({ href, bytes })),
        broken,
        heavy: heavy.map(({ href, bytes }) => ({ href, bytes })),
        deadBytes,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`BROKEN REFERENCES (${broken.length})`);
  console.log(
    broken.length === 0
      ? "  none"
      : broken.map((href) => `  ${href}`).join("\n"),
  );

  console.log(`\nDEAD ASSETS (${dead.length}, ${mb(deadBytes)})`);
  const byDir = dead.reduce<Map<string, Asset[]>>(
    (groups, asset) =>
      groups.set(asset.dir || "(root)", [
        ...(groups.get(asset.dir || "(root)") ?? []),
        asset,
      ]),
    new Map(),
  );
  [...byDir.entries()]
    .sort(
      (a, b) =>
        b[1].reduce((t, x) => t + x.bytes, 0) -
        a[1].reduce((t, x) => t + x.bytes, 0),
    )
    .forEach(([dir, group]) => {
      const bytes = group.reduce((total, asset) => total + asset.bytes, 0);
      console.log(`  ${dir}/  ${group.length} files  ${mb(bytes)}`);
      group
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 6)
        .forEach((asset) =>
          console.log(`    ${kb(asset.bytes)}  ${asset.href}`),
        );
      if (group.length > 6) console.log(`    ... ${group.length - 6} more`);
    });

  console.log(
    `\nHEAVY RESOLVED ASSETS (${heavy.length} over ${kb(HEAVY_BYTES)})`,
  );
  heavy
    .slice(0, 12)
    .forEach((asset) => console.log(`  ${kb(asset.bytes)}  ${asset.href}`));
  if (heavy.length > 12) console.log(`  ... ${heavy.length - 12} more`);

  console.log(
    `\nSigils excluded by design: run \`bun test lib/sigil-integrity.test.ts\` ` +
      `(see the tkw-sigil-audit skill).`,
  );
}
