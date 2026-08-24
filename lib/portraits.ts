import fs from "node:fs/promises";
import path from "node:path";
import type { Character } from "@/lib/schemas";

/**
 * Probe order. The first extension that exists on disk wins, so a slug with
 * two files renders one and carries the other as dead weight.
 * `lib/portrait-integrity.ts` reads this rather than restating it.
 */
export const PORTRAIT_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;

/**
 * Probe order for the hover video that animates a portrait. The still always
 * renders; a resolved video adds the play-on-hover layer.
 */
export const PORTRAIT_VIDEO_EXTENSIONS = ["mp4"] as const;

/** Numbered placeholders per sex, `unknown-<sex>-01.jpg` through `-05.jpg`. */
export const PLACEHOLDER_VARIANTS = 5;

/** The extension every placeholder in the fallback pool is stored as. */
export const PLACEHOLDER_EXTENSION = "jpg";

function placeholderVariant(slug: string): number {
  const hash = [...slug].reduce(
    (acc, char) => (acc * 33 + char.charCodeAt(0)) >>> 0,
    5381,
  );
  return (hash % PLACEHOLDER_VARIANTS) + 1;
}

async function probe(file: string): Promise<string | null> {
  try {
    await fs.access(path.join(process.cwd(), "public", "characters", file));
    return `/characters/${file}`;
  } catch {
    return null;
  }
}

/**
 * A character whose art has grown past a single picture keeps every version in
 * `public/characters/<slug>/` instead of a flat file. The one inside that
 * folder named for the slug is the primary, so a flat file and a folder answer
 * the same probe and every caller that wants one portrait keeps working.
 * `lib/portrait-variants.ts` reads the rest of the folder.
 */
function probePaths(slug: string, extension: string): string[] {
  return [`${slug}.${extension}`, `${slug}/${slug}.${extension}`];
}

export async function findPortrait(
  slug: string,
  sex: Character["sex"],
): Promise<string> {
  const candidates = await Promise.all(
    PORTRAIT_EXTENSIONS.flatMap((ext) => probePaths(slug, ext).map(probe)),
  );

  const dedicated = candidates.find((candidate) => !!candidate);
  if (dedicated) {
    return dedicated;
  }

  const gender = sex === "f" ? "female" : "male";
  const variant = String(placeholderVariant(slug)).padStart(2, "0");
  return `/characters/unknown-${gender}-${variant}.${PLACEHOLDER_EXTENSION}`;
}

export async function findPortraitVideo(slug: string): Promise<string | null> {
  const candidates = await Promise.all(
    PORTRAIT_VIDEO_EXTENSIONS.flatMap((ext) =>
      probePaths(slug, ext).map(probe),
    ),
  );
  return candidates.find((candidate) => !!candidate) ?? null;
}
