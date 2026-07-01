import fs from "node:fs/promises";
import path from "node:path";

const WEAPON_IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;

export async function findWeaponImage(slug: string): Promise<string | null> {
  const candidates = await Promise.all(
    WEAPON_IMAGE_EXTENSIONS.map(async (ext) => {
      try {
        await fs.access(
          path.join(process.cwd(), "public", "weapons", `${slug}.${ext}`),
        );
        return `/weapons/${slug}.${ext}`;
      } catch {
        return null;
      }
    }),
  );

  return candidates.find((candidate) => !!candidate) ?? null;
}
