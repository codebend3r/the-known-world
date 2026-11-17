import fs from "node:fs/promises";
import path from "node:path";
import {
  findPortrait,
  findPortraitVideo,
  PORTRAIT_EXTENSIONS,
  PORTRAIT_VIDEO_EXTENSIONS,
} from "@/lib/portraits";
import {
  describeFiles,
  groupByStem,
  isStemOfSlug,
  pickByExtension,
} from "@/lib/portrait-files";
import type { Character } from "@/lib/schemas";
import { humanizeSlug } from "@/lib/text";

/**
 * Some characters are remembered as more than one person: Duncan the Tall is a
 * hedge knight for four novellas and a white cloak for the rest of his life.
 * Art for those lives in `public/characters/<slug>/` rather than a flat file,
 * and the folder IS the declaration — no frontmatter turns the feature on.
 *
 *   public/characters/duncan-the-tall/duncan-the-tall.jpg      ← primary
 *   public/characters/duncan-the-tall/duncan-the-tall.mp4
 *   public/characters/duncan-the-tall/duncan-the-tall-kingsguard.jpg
 *   public/characters/duncan-the-tall/duncan-the-tall-kingsguard.mp4
 *
 * The primary is named for the slug and is what every unspoiled surface shows.
 * Every other file carries a suffix, which is both its identity and its label.
 * A later life is a spoiler by definition, so the extra variants only surface
 * once the reader has turned spoilers on — see `lib/spoilers.ts`.
 */
export type PortraitVariant = {
  /** File stem, unique within the character: `duncan-the-tall-kingsguard`. */
  id: string;
  /** Tab label. The character's name for the primary, the suffix otherwise. */
  label: string;
  image: string;
  video: string | null;
  /** The one variant shown with spoilers off. Exactly one is ever true. */
  isPrimary: boolean;
};

const PORTRAIT_DIR = path.join(process.cwd(), "public", "characters");

/**
 * Everything after `<slug>-`, humanised: `kingsguard` → `Kingsguard`.
 *
 * A slug already contains hyphens, so `<slug>--<variant>` is the unambiguous
 * way to write the join and both spellings appear on disk. Extra hyphens are
 * separator, not label.
 */
export function variantLabel({
  slug,
  stem,
}: {
  slug: string;
  stem: string;
}): string {
  return humanizeSlug(stem.slice(slug.length).replace(/^-+/, ""));
}

/**
 * Turn one folder listing into ordered variants. Primary first, the rest
 * alphabetical by label — the suffixes are eras of a life, and no filename
 * convention can order those, so the only honest order is a stable one.
 */
export function buildPortraitVariants({
  slug,
  name,
  files,
}: {
  slug: string;
  name: string;
  files: readonly string[];
}): PortraitVariant[] {
  const entries = describeFiles(files).filter((entry) =>
    isStemOfSlug({ slug, stem: entry.stem }),
  );

  const variants = [...groupByStem(entries).entries()].flatMap(
    ([stem, candidates]) => {
      const image = pickByExtension({
        candidates,
        extensions: PORTRAIT_EXTENSIONS,
      });
      if (!image) return [];
      const video = pickByExtension({
        candidates,
        extensions: PORTRAIT_VIDEO_EXTENSIONS,
      });
      const isPrimary = stem === slug;
      return [
        {
          id: stem,
          label: isPrimary ? name : variantLabel({ slug, stem }),
          image: `/characters/${slug}/${image.file}`,
          video: video ? `/characters/${slug}/${video.file}` : null,
          isPrimary,
        },
      ];
    },
  );

  const rest = variants
    .filter((variant) => !variant.isPrimary)
    .toSorted((a, b) => a.label.localeCompare(b.label));
  const primary = variants.find((variant) => variant.isPrimary);
  if (primary) return [primary, ...rest];

  // No `<slug>.<ext>` on disk. `lib/portrait-integrity.ts` reports that as an
  // error; until it is fixed, promoting the first variant is what keeps the
  // spoiler gate closed, since the gate is "index 0 only".
  const [first, ...others] = rest;
  return first ? [{ ...first, isPrimary: true }, ...others] : [];
}

async function readVariantDir(slug: string): Promise<string[] | null> {
  try {
    return await fs.readdir(path.join(PORTRAIT_DIR, slug));
  } catch {
    return null;
  }
}

/**
 * Every portrait a character has, always at least one. A character with no
 * folder resolves to the single flat portrait — or the hashed placeholder —
 * exactly as before, so the page renders one shape for both cases.
 */
export async function findPortraitVariants({
  slug,
  name,
  sex,
}: {
  slug: string;
  name: string;
  sex: Character["sex"];
}): Promise<PortraitVariant[]> {
  const files = await readVariantDir(slug);
  const variants = files ? buildPortraitVariants({ slug, name, files }) : [];
  if (variants.length > 0) return variants;

  const [image, video] = await Promise.all([
    findPortrait({ slug, sex }),
    findPortraitVideo(slug),
  ]);
  return [{ id: slug, label: name, image, video, isPrimary: true }];
}
