import path from "node:path";

export type PortraitFile = {
  /** Filename as it sits in its directory, e.g. `jon-snow.jpg`. */
  file: string;
  /** Basename without the extension, compared against character slugs. */
  stem: string;
  /** Lowercased extension without the dot. */
  extension: string;
};

/** Dotfiles dropped, the rest split into stem and extension, sorted by name. */
export function describeFiles(files: readonly string[]): PortraitFile[] {
  return files
    .filter((file) => !file.startsWith("."))
    .map((file) => ({
      file,
      stem: path.basename(file, path.extname(file)),
      extension: path.extname(file).slice(1).toLowerCase(),
    }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
}

export function groupByStem(
  files: readonly PortraitFile[],
): Map<string, PortraitFile[]> {
  return files.reduce<Map<string, PortraitFile[]>>(
    (groups, entry) =>
      groups.set(entry.stem, [...(groups.get(entry.stem) ?? []), entry]),
    new Map(),
  );
}

/** The first candidate in `extensions` order, mirroring the disk probes. */
export function pickByExtension({
  candidates,
  extensions,
}: {
  candidates: readonly PortraitFile[];
  extensions: readonly string[];
}): PortraitFile | null {
  return extensions.reduce<PortraitFile | null>(
    (winner, extension) =>
      winner ??
      candidates.find((entry) => entry.extension === extension) ??
      null,
    null,
  );
}

/** The primary (`<slug>`) or a suffixed variant (`<slug>-<variant>`). */
export function isStemOfSlug({
  slug,
  stem,
}: {
  slug: string;
  stem: string;
}): boolean {
  return stem === slug || stem.startsWith(`${slug}-`);
}
