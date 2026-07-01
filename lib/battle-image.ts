import fs from "node:fs/promises";
import path from "node:path";

const BATTLE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/**
 * Return the public path of a battle's illustration if one exists at
 * `public/battles/<slug>.<ext>`, or null when the battle has no image.
 */
export async function findBattleImage(slug: string): Promise<string | null> {
  const candidates = await Promise.all(
    BATTLE_IMAGE_EXTENSIONS.map(async (ext) => {
      try {
        await fs.access(
          path.join(process.cwd(), "public", "battles", `${slug}.${ext}`),
        );
        return `/battles/${slug}.${ext}`;
      } catch {
        return null;
      }
    }),
  );
  return candidates.find((candidate) => !!candidate) ?? null;
}
