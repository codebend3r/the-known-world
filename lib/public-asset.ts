import fs from "node:fs/promises";
import path from "node:path";

/**
 * The URL of the first of `files` that exists under `public/<dir>/`, or null.
 * Every file is probed at once; the order of `files` alone decides the winner.
 */
export async function findPublicAsset({
  dir,
  files,
}: {
  dir: string;
  files: readonly string[];
}): Promise<string | null> {
  const candidates = await Promise.all(
    files.map(async (file) => {
      try {
        await fs.access(path.join(process.cwd(), "public", dir, file));
        return `/${dir}/${file}`;
      } catch {
        return null;
      }
    }),
  );
  return candidates.find((candidate) => !!candidate) ?? null;
}
