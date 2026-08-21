import fs from "node:fs/promises";
import path from "node:path";
import {
  PLACEHOLDER_EXTENSION,
  PLACEHOLDER_VARIANTS,
  PORTRAIT_EXTENSIONS,
} from "@/lib/portraits";

/**
 * `findPortrait` probes `public/characters/<slug>.<ext>` and never reads the
 * directory, so a misnamed file is invisible: the character falls back to a
 * hashed placeholder that looks deliberate and nothing fails. These checks
 * read the directory instead and compare it back against `content/characters/`.
 *
 * Whole-repo asset weight and orphans outside this directory belong to the
 * `image-optimize` skill; sigils belong to `lib/sigil-integrity.ts`.
 */

const PORTRAIT_DIR = path.join(process.cwd(), "public", "characters");

/** The ten basenames the placeholder fallback hashes into. */
export const PLACEHOLDER_STEMS: ReadonlySet<string> = new Set(
  ["male", "female"].flatMap((sex) =>
    Array.from(
      { length: PLACEHOLDER_VARIANTS },
      (_unused, index) =>
        `unknown-${sex}-${String(index + 1).padStart(2, "0")}`,
    ),
  ),
);

/** The same pool as filenames. All ten must exist or the fallback 404s. */
export const PLACEHOLDER_FILES: ReadonlySet<string> = new Set(
  [...PLACEHOLDER_STEMS].map((stem) => `${stem}.${PLACEHOLDER_EXTENSION}`),
);

/**
 * Art staged on disk ahead of the `content/characters/` entry that would make
 * it resolve. Every slug here needs a named follow-up. The list exists so
 * finished art is not deleted for want of markdown, not to silence orphans.
 *
 * `thoros-of-myr`: the red priest of the Brotherhood Without Banners. The
 * portrait landed in #20; the entry has never been written. Populate it with
 * `populate-character` and drop this entry.
 */
export const RESERVED_PORTRAITS: ReadonlySet<string> = new Set([
  "thoros-of-myr",
]);

/**
 * A stem within this normalised edit distance of a real slug is reported as a
 * probable typo rather than as unrecognised art. Advisory only: the file is an
 * orphan either way, this only names the rename target.
 */
const NEAR_MISS_RATIO = 0.3;

export type PortraitFile = {
  /** Filename as it sits in `public/characters/`, e.g. `jon-snow.jpg`. */
  file: string;
  /** Basename without the extension, compared against character slugs. */
  stem: string;
  /** Lowercased extension without the dot. */
  extension: string;
};

type PortraitSources = {
  files: readonly PortraitFile[];
  characterSlugs: ReadonlySet<string>;
};

export function isProbedExtension(extension: string): boolean {
  return PORTRAIT_EXTENSIONS.some((candidate) => candidate === extension);
}

export async function loadPortraitFiles(): Promise<PortraitFile[]> {
  const entries = await fs.readdir(PORTRAIT_DIR);
  return entries
    .filter((file) => !file.startsWith("."))
    .map((file) => ({
      file,
      stem: path.basename(file, path.extname(file)),
      extension: path.extname(file).slice(1).toLowerCase(),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Group every file on disk by the slug its name claims. */
export function groupByStem(
  files: readonly PortraitFile[],
): Map<string, PortraitFile[]> {
  return files.reduce<Map<string, PortraitFile[]>>(
    (groups, entry) =>
      groups.set(entry.stem, [...(groups.get(entry.stem) ?? []), entry]),
    new Map(),
  );
}

/** The candidate `findPortrait` returns first, or null when none is probed. */
export function winningFile({
  candidates,
}: {
  candidates: readonly PortraitFile[];
}): PortraitFile | null {
  return PORTRAIT_EXTENSIONS.reduce<PortraitFile | null>(
    (winner, extension) =>
      winner ??
      candidates.find((entry) => entry.extension === extension) ??
      null,
    null,
  );
}

/**
 * Levenshtein distance between `a` and `b`, or `limit + 1` when the two are
 * too far apart in length to possibly land within `limit`.
 *
 * The length gap is the only shortcut: there is no row-wise pruning, because
 * the corpus does not need it. The widest call compares one stray portrait
 * stem against ~900 slugs of ~20 characters, which is microseconds.
 */
export function editDistance({
  a,
  b,
  limit,
}: {
  a: string;
  b: string;
  limit: number;
}): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const bChars = [...b];
  const firstRow = Array.from({ length: bChars.length + 1 }, (_unused, i) => i);
  const lastRow = [...a].reduce<number[]>((previous, aChar, aIndex) => {
    // Each cell reads the one to its left, so a row is a sequential fill of a
    // fresh local array rather than a `map`. Spreading a new array per cell
    // (the previous shape) made building one row quadratic in `b.length`.
    const current = [aIndex + 1];
    bChars.forEach((bChar, bIndex) => {
      current.push(
        Math.min(
          (previous[bIndex + 1] ?? 0) + 1,
          (current[bIndex] ?? 0) + 1,
          (previous[bIndex] ?? 0) + (aChar === bChar ? 0 : 1),
        ),
      );
    });
    return current;
  }, firstRow);
  return lastRow[bChars.length] ?? limit + 1;
}

function closestWithin({
  stem,
  slugs,
  limit,
}: {
  stem: string;
  slugs: readonly string[];
  limit: number;
}): string | null {
  return slugs.reduce<{ slug: string | null; distance: number }>(
    (winner, slug) => {
      const distance = editDistance({ a: stem, b: slug, limit });
      return distance <= limit && distance < winner.distance
        ? { slug, distance }
        : winner;
    },
    { slug: null, distance: limit + 1 },
  ).slug;
}

/**
 * The character slug a stem was most likely meant to be, if one is close.
 *
 * Slugs that already resolve to their own file are considered last. A slug
 * rendering its own art is not what the stray file was for, and raw edit
 * distance gets this wrong: `vaemond-targaryen` sits one edit from
 * `aemond-targaryen` (which has art) and two from `vaegon-targaryen` (which
 * does not, and is the maester the picture actually shows).
 */
export function nearestSlug({
  stem,
  characterSlugs,
  coveredSlugs = new Set<string>(),
}: {
  stem: string;
  characterSlugs: ReadonlySet<string>;
  coveredSlugs?: ReadonlySet<string>;
}): string | null {
  const limit = Math.floor(stem.length * NEAR_MISS_RATIO);
  if (limit < 1) return null;
  const all = [...characterSlugs];
  const uncovered = all.filter((slug) => !coveredSlugs.has(slug));
  return (
    closestWithin({ stem, slugs: uncovered, limit }) ??
    closestWithin({ stem, slugs: all, limit })
  );
}

/** Slugs that already resolve to a file of their own through the probe. */
export function coveredSlugs({
  files,
  characterSlugs,
}: PortraitSources): Set<string> {
  const byStem = groupByStem(files);
  return new Set(
    [...characterSlugs].filter(
      (slug) => !!winningFile({ candidates: byStem.get(slug) ?? [] }),
    ),
  );
}

export function portraitIntegrityErrors({
  files,
  characterSlugs,
}: PortraitSources): string[] {
  const byStem = groupByStem(files);
  const onDisk = new Set(files.map((entry) => entry.file));
  const covered = coveredSlugs({ files, characterSlugs });

  const unprobed = files
    .filter((entry) => !isProbedExtension(entry.extension))
    .map(
      (entry) =>
        `characters/${entry.file}: extension .${entry.extension} is not in PORTRAIT_EXTENSIONS, findPortrait can never return it`,
    );

  const orphans = [...byStem.entries()]
    .filter(
      ([stem]) =>
        !characterSlugs.has(stem) &&
        !RESERVED_PORTRAITS.has(stem) &&
        !PLACEHOLDER_STEMS.has(stem),
    )
    .flatMap(([stem, candidates]) => {
      const nearest = nearestSlug({
        stem,
        characterSlugs,
        coveredSlugs: covered,
      });
      return candidates
        .filter((entry) => isProbedExtension(entry.extension))
        .map((entry) =>
          nearest
            ? `characters/${entry.file}: no content/characters/${stem}.md; closest slug is ${nearest}, rename or delete it`
            : `characters/${entry.file}: no content/characters/${stem}.md, and no slug is close enough to be a typo`,
        );
    });

  const duplicates = [...byStem.entries()]
    .filter(([stem]) => characterSlugs.has(stem))
    .flatMap(([stem, candidates]) => {
      const probed = candidates.filter((entry) =>
        isProbedExtension(entry.extension),
      );
      const winner = winningFile({ candidates: probed });
      if (!winner || probed.length < 2) return [];
      return probed
        .filter((entry) => entry.file !== winner.file)
        .map(
          (entry) =>
            `characters/${entry.file}: dead weight, findPortrait returns ${winner.file} for ${stem} first`,
        );
    });

  const missing = [...PLACEHOLDER_FILES]
    .filter((file) => !onDisk.has(file))
    .sort()
    .map(
      (file) =>
        `characters/${file}: missing, required by the placeholder fallback`,
    );

  const staleReservations = [...RESERVED_PORTRAITS]
    .filter((stem) => characterSlugs.has(stem))
    .sort()
    .map(
      (stem) =>
        `RESERVED_PORTRAITS ${stem}: content/characters/${stem}.md now exists, drop it from the list`,
    );

  return [
    ...unprobed.sort(),
    ...orphans.sort(),
    ...duplicates.sort(),
    ...missing,
    ...staleReservations,
  ];
}
