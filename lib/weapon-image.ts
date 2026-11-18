import { findPublicAsset } from "@/lib/public-asset";

const WEAPON_IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;

export async function findWeaponImage(slug: string): Promise<string | null> {
  return findPublicAsset({
    dir: "weapons",
    files: WEAPON_IMAGE_EXTENSIONS.map((ext) => `${slug}.${ext}`),
  });
}
