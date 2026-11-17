import { findPublicAsset } from "@/lib/public-asset";

const BATTLE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/**
 * Return the public path of a battle's illustration if one exists at
 * `public/battles/<slug>.<ext>`, or null when the battle has no image.
 */
export async function findBattleImage(slug: string): Promise<string | null> {
  return findPublicAsset({
    dir: "battles",
    files: BATTLE_IMAGE_EXTENSIONS.map((ext) => `${slug}.${ext}`),
  });
}
