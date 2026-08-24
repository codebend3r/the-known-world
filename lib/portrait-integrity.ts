import fs from "node:fs/promises";
import path from "node:path";
import {
  PLACEHOLDER_EXTENSION,
  PLACEHOLDER_VARIANTS,
  PORTRAIT_EXTENSIONS,
  PORTRAIT_VIDEO_EXTENSIONS,
} from "@/lib/portraits";

/**
 * `findPortrait` and `findPortraitVideo` probe `public/characters/<slug>.<ext>`
 * and never read the directory, so a misnamed file is invisible: the character
 * falls back to a hashed placeholder that looks deliberate and nothing fails.
 * These checks read the directory instead and compare it back against
 * `content/characters/`.
 *
 * A character with more than one portrait keeps them in a folder rather than a
 * flat file (see `lib/portrait-variants.ts`), which the same silence applies
 * to twice over: a folder whose primary is misnamed still renders a
 * placeholder, and a variant whose suffix is misspelled simply never appears
 * in the switcher. Folders are read separately from flat files below.
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
 *
 * `khal-drogo`: portrait and hover video landed with the 2026-08 art batch;
 * the entry has never been written. Populate it with `populate-character`
 * and drop this entry.
 */
export const RESERVED_PORTRAITS: ReadonlySet<string> = new Set([
  "thoros-of-myr",
  "khal-drogo",
]);

/**
 * A stem within this normalised edit distance of a real slug is reported as a
 * probable typo rather than as unrecognised art. Advisory only: the file is an
 * orphan either way, this only names the rename target.
 */
const NEAR_MISS_RATIO = 0.3;

export type PortraitFile = {
  /** Filename as it sits in its directory, e.g. `jon-snow.jpg`. */
  file: string;
  /** Basename without the extension, compared against character slugs. */
  stem: string;
  /** Lowercased extension without the dot. */
  extension: string;
};

/** One `public/characters/<slug>/` folder and everything inside it. */
export type PortraitVariantDir = {
  /** The folder name, which must be a character slug. */
  slug: string;
  files: readonly PortraitFile[];
};

type PortraitSources = {
  files: readonly PortraitFile[];
  characterSlugs: ReadonlySet<string>;
  variantDirs?: readonly PortraitVariantDir[];
};

export function isProbedExtension(extension: string): boolean {
  return PORTRAIT_EXTENSIONS.some((candidate) => candidate === extension);
}

export function isVideoExtension(extension: string): boolean {
  return PORTRAIT_VIDEO_EXTENSIONS.some((candidate) => candidate === extension);
}

function describeFiles(files: readonly string[]): PortraitFile[] {
  return files
    .filter((file) => !file.startsWith("."))
    .map((file) => ({
      file,
      stem: path.basename(file, path.extname(file)),
      extension: path.extname(file).slice(1).toLowerCase(),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Flat portraits only. Variant folders come back from the loader below. */
export async function loadPortraitFiles(): Promise<PortraitFile[]> {
  const entries = await fs.readdir(PORTRAIT_DIR, { withFileTypes: true });
  return describeFiles(
    entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name),
  );
}

export async function loadPortraitVariantDirs(): Promise<PortraitVariantDir[]> {
  const entries = await fs.readdir(PORTRAIT_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  return Promise.all(
    dirs.map(async (slug) => ({
      slug,
      files: describeFiles(await fs.readdir(path.join(PORTRAIT_DIR, slug))),
    })),
  );
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

/** Levenshtein distance, bailing out once the pair is further apart than `limit`. */
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
  const firstRow = [...b].reduce<number[]>(
    (row, _unused, index) => [...row, index + 1],
    [0],
  );
  const lastRow = [...a].reduce<number[]>(
    (previous, aChar, aIndex) =>
      [...b].reduce<number[]>(
        (current, bChar, bIndex) => [
          ...current,
          Math.min(
            (previous[bIndex + 1] ?? 0) + 1,
            (current[bIndex] ?? 0) + 1,
            (previous[bIndex] ?? 0) + (aChar === bChar ? 0 : 1),
          ),
        ],
        [aIndex + 1],
      ),
    firstRow,
  );
  return lastRow[b.length] ?? limit + 1;
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

/**
 * Errors for one `public/characters/<slug>/` folder: the folder itself must
 * name a character, and every file in it must be either the primary or a
 * suffixed variant of that same slug.
 */
export function variantDirErrors({
  dir,
  characterSlugs,
}: {
  dir: PortraitVariantDir;
  characterSlugs: ReadonlySet<string>;
}): string[] {
  const { slug, files } = dir;
  if (!characterSlugs.has(slug) && !RESERVED_PORTRAITS.has(slug)) {
    const nearest = nearestSlug({ stem: slug, characterSlugs });
    return [
      nearest
        ? `characters/${slug}/: no content/characters/${slug}.md; closest slug is ${nearest}, rename or delete the folder`
        : `characters/${slug}/: no content/characters/${slug}.md, and no slug is close enough to be a typo`,
    ];
  }

  const misnamed = files
    .filter(
      (entry) => entry.stem !== slug && !entry.stem.startsWith(`${slug}-`),
    )
    .map(
      (entry) =>
        `characters/${slug}/${entry.file}: stem is neither ${slug} nor ${slug}-<variant>, no variant can ever return it`,
    );

  const unprobed = files
    .filter(
      (entry) =>
        !isProbedExtension(entry.extension) &&
        !isVideoExtension(entry.extension),
    )
    .map(
      (entry) =>
        `characters/${slug}/${entry.file}: extension .${entry.extension} is in neither PORTRAIT_EXTENSIONS nor PORTRAIT_VIDEO_EXTENSIONS, no finder can ever return it`,
    );

  const named = files.filter(
    (entry) => entry.stem === slug || entry.stem.startsWith(`${slug}-`),
  );
  const byStem = groupByStem(named);

  const missingPrimary = winningFile({ candidates: byStem.get(slug) ?? [] })
    ? []
    : [
        `characters/${slug}/: no ${slug}.<ext> still, so findPortrait falls back to a placeholder`,
      ];

  // A clip with no still of its own is a variant that can never be selected:
  // the switcher is built from the images.
  const strandedVideos = [...byStem.entries()]
    .filter(([stem]) => stem !== slug)
    .filter(([, candidates]) => !winningFile({ candidates }))
    .flatMap(([stem, candidates]) =>
      candidates
        .filter((entry) => isVideoExtension(entry.extension))
        .map(
          (entry) =>
            `characters/${slug}/${entry.file}: no ${stem}.<ext> still, so the ${stem} variant never renders`,
        ),
    );

  const duplicates = [...byStem.entries()].flatMap(([stem, candidates]) => {
    const probed = candidates.filter((entry) =>
      isProbedExtension(entry.extension),
    );
    const winner = winningFile({ candidates: probed });
    if (!winner || probed.length < 2) return [];
    return probed
      .filter((entry) => entry.file !== winner.file)
      .map(
        (entry) =>
          `characters/${slug}/${entry.file}: dead weight, ${stem} resolves to ${winner.file} first`,
      );
  });

  return [
    ...misnamed,
    ...unprobed,
    ...missingPrimary,
    ...strandedVideos,
    ...duplicates,
  ].sort();
}

export function portraitIntegrityErrors({
  files,
  characterSlugs,
  variantDirs = [],
}: PortraitSources): string[] {
  const byStem = groupByStem(files);
  const onDisk = new Set(files.map((entry) => entry.file));
  const covered = coveredSlugs({ files, characterSlugs });

  const unprobed = files
    .filter(
      (entry) =>
        !isProbedExtension(entry.extension) &&
        !isVideoExtension(entry.extension),
    )
    .map(
      (entry) =>
        `characters/${entry.file}: extension .${entry.extension} is in neither PORTRAIT_EXTENSIONS nor PORTRAIT_VIDEO_EXTENSIONS, no finder can ever return it`,
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
        .filter(
          (entry) =>
            isProbedExtension(entry.extension) ||
            isVideoExtension(entry.extension),
        )
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

  // `findPortrait` probes the flat file first, so a folder behind one of the
  // same name is unreachable and its variants are invisible.
  const shadowed = variantDirs
    .filter((dir) => !!winningFile({ candidates: byStem.get(dir.slug) ?? [] }))
    .map(
      (dir) =>
        `characters/${dir.slug}/: shadowed by the flat characters/${dir.slug} file, which findPortrait returns first`,
    )
    .sort();

  const variants = variantDirs.flatMap((dir) =>
    variantDirErrors({ dir, characterSlugs }),
  );

  return [
    ...unprobed.sort(),
    ...orphans.sort(),
    ...duplicates.sort(),
    ...missing,
    ...staleReservations,
    ...shadowed,
    ...variants,
  ];
}
