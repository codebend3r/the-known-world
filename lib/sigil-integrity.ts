import fs from "node:fs/promises";
import path from "node:path";
import { REGION_SLUGS } from "@/lib/regions";
import { SIGIL_SLUGS, sigilFile } from "@/lib/sigil";

const SIGIL_DIR = path.join(process.cwd(), "public", "sigils");

/**
 * A slug guaranteed to be absent from SIGIL_SLUGS, used to probe the region and
 * final fallbacks. REGION_FILE and SLUG_ALIASES are private to lib/sigil.ts, so
 * this module asks sigilFile() what it resolves to instead of duplicating
 * tables that would silently rot.
 */
const UNREGISTERED_PROBE = "__unregistered-probe__";

/**
 * Slugs deliberately registered without backing markdown. `unknown` is the
 * placeholder house slug used by family-tree nodes and by characters with no
 * known house. Only add a slug here when it is genuinely content-free.
 */
const SENTINEL_SLUGS = new Set(["unknown"]);

/**
 * Images kept on disk on purpose while nothing resolves to them yet.
 * `unknown-essos` is the Essos counterpart to `unknown-westeros`, reserved for
 * unknown Essosi cities and towns.
 */
const RESERVED_IMAGES = new Set(["unknown-essos"]);

type Reachable = [file: string, reason: string];

type SigilSources = {
  images: ReadonlySet<string>;
  houseSlugs: ReadonlySet<string>;
  characterSlugs: ReadonlySet<string>;
};

/** Every sigil file the app can request, mapped to why it is reachable. */
export function reachableSigilFiles(): Map<string, string> {
  const fromSlugs: Reachable[] = [...SIGIL_SLUGS].map((slug) => [
    sigilFile({ slug }),
    `SIGIL_SLUGS ${slug}`,
  ]);
  const fromRegions: Reachable[] = REGION_SLUGS.map((region) => [
    sigilFile({ slug: UNREGISTERED_PROBE, region }),
    `region fallback ${region}`,
  ]);
  const finalFallback: Reachable = [
    sigilFile({ slug: UNREGISTERED_PROBE }),
    "final fallback",
  ];
  return new Map([...fromSlugs, ...fromRegions, finalFallback]);
}

export async function loadSigilImages(): Promise<Set<string>> {
  const files = await fs.readdir(SIGIL_DIR);
  return new Set(
    files
      .filter((file) => file.endsWith(".png"))
      .map((file) => path.basename(file, ".png")),
  );
}

export function sigilIntegrityErrors({
  images,
  houseSlugs,
  characterSlugs,
}: SigilSources): string[] {
  const reachable = reachableSigilFiles();

  const unreferenced = [...images]
    .filter((file) => !reachable.has(file) && !RESERVED_IMAGES.has(file))
    .sort()
    .map((file) => {
      if (SIGIL_SLUGS.has(file)) {
        return `sigils/${file}.png: registered, but SLUG_ALIASES redirects it to ${sigilFile({ slug: file })}.png`;
      }
      if (houseSlugs.has(file)) {
        return `sigils/${file}.png: houses/${file} exists, but the slug is missing from SIGIL_SLUGS`;
      }
      if (characterSlugs.has(file)) {
        return `sigils/${file}.png: characters/${file} exists, but the slug is missing from SIGIL_SLUGS`;
      }
      return `sigils/${file}.png: unreferenced, and no house or character entry uses this slug`;
    });

  const missing = [...reachable.entries()]
    .filter(([file]) => !images.has(file))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([file, reason]) => `sigils/${file}.png: missing, required by ${reason}`,
    );

  const unbacked = [...SIGIL_SLUGS]
    .filter(
      (slug) =>
        !houseSlugs.has(slug) &&
        !characterSlugs.has(slug) &&
        !SENTINEL_SLUGS.has(slug),
    )
    .sort()
    .map(
      (slug) =>
        `SIGIL_SLUGS ${slug}: no houses/${slug} or characters/${slug} entry`,
    );

  return [...unreferenced, ...missing, ...unbacked];
}
