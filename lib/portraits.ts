import fs from "node:fs/promises";
import path from "node:path";
import type { Character } from "@/lib/schemas";

/**
 * Probe order. The first extension that exists on disk wins, so a slug with
 * two files renders one and carries the other as dead weight.
 * `lib/portrait-integrity.ts` reads this rather than restating it.
 */
export const PORTRAIT_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;

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

export async function findPortrait(
  slug: string,
  sex: Character["sex"],
): Promise<string> {
  const candidates = await Promise.all(
    PORTRAIT_EXTENSIONS.map(async (ext) => {
      try {
        await fs.access(
          path.join(process.cwd(), "public", "characters", `${slug}.${ext}`),
        );
        return `/characters/${slug}.${ext}`;
      } catch {
        return null;
      }
    }),
  );

  const dedicated = candidates.find((candidate) => !!candidate);
  if (dedicated) {
    return dedicated;
  }

  const gender = sex === "f" ? "female" : "male";
  const variant = String(placeholderVariant(slug)).padStart(2, "0");
  return `/characters/unknown-${gender}-${variant}.${PLACEHOLDER_EXTENSION}`;
}
