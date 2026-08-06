/**
 * Audits the character portrait pipeline: `public/characters/` against
 * `content/characters/`, through the probe order `lib/portraits.ts` implements.
 *
 *   COVERAGE   how many characters render dedicated art versus a placeholder
 *   ORPHANS    files whose stem matches no slug, with the likely rename target
 *   DUPLICATES one slug, two extensions: which wins, which is dead weight
 *   OVERSIZED  resolved art far above the largest size any view renders
 *   ASPECT     files off the 3:2 the card grid crops to
 *   UNCOVERED  characters with no art, ranked by inbound references
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-portrait-pipeline/audit-portraits.ts
 *   bun .claude/skills/tkw-portrait-pipeline/audit-portraits.ts --json
 *
 * Read-only. Deletes, renames, and re-encodes nothing.
 *
 * Whole-repo asset weight and orphans outside `public/characters/` belong to
 * the `tkw-image-optimize` skill; sigils belong to `tkw-sigil-audit`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  loadAllBattles,
  loadAllCharacters,
  loadAllDragons,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import {
  coveredSlugs,
  groupByStem,
  isProbedExtension,
  loadPortraitFiles,
  nearestSlug,
  PLACEHOLDER_STEMS,
  portraitIntegrityErrors,
  RESERVED_PORTRAITS,
  winningFile,
  type PortraitFile,
} from "@/lib/portrait-integrity";

const PORTRAIT_DIR = path.join(process.cwd(), "public", "characters");

/**
 * The widest a portrait is ever rendered. `app/characters/[slug]/page.tsx`
 * declares `width={1200}` with `sizes="(max-width: 768px) 100vw, 1100px"`;
 * the card grid asks for 270px and the family tree for 96px. Sources wider
 * than this only feed the Netlify CDN pixels it throws away.
 */
const MAX_RENDERED_WIDTH = 1200;

/** Allowance over `MAX_RENDERED_WIDTH` before a source counts as oversized. */
const WIDTH_TOLERANCE = 1.5;

/**
 * Bytes above which a portrait is an outlier. The heaviest conforming file in
 * the repo is 329KB, so this only catches art that skipped the pipeline.
 */
const HEAVY_BYTES = 400_000;

/** `FilteredCharacterList` crops every card to `aspect-ratio: 3 / 2`. */
const TARGET_ASPECT = 3 / 2;
const ASPECT_TOLERANCE = 0.05;

type Dimensions = { width: number; height: number };

type Measured = {
  file: string;
  stem: string;
  extension: string;
  bytes: number;
  width?: number;
  height?: number;
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function pngDimensions(view: DataView): Dimensions | null {
  if (view.byteLength < 24) return null;
  if (view.getUint32(0) !== 0x89504e47) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Walks JPEG segments to the first start-of-frame marker. */
function jpegDimensionsAt(view: DataView, offset: number): Dimensions | null {
  if (offset + 4 > view.byteLength) return null;
  if (view.getUint8(offset) !== 0xff) return null;
  const marker = view.getUint8(offset + 1);
  // Standalone markers (SOI, RSTn, EOI, TEM) carry no length field.
  if (
    marker === 0xd8 ||
    marker === 0x01 ||
    (marker >= 0xd0 && marker <= 0xd9)
  ) {
    return jpegDimensionsAt(view, offset + 2);
  }
  if (SOF_MARKERS.has(marker)) {
    if (offset + 9 > view.byteLength) return null;
    return {
      height: view.getUint16(offset + 5),
      width: view.getUint16(offset + 7),
    };
  }
  return jpegDimensionsAt(view, offset + 2 + view.getUint16(offset + 2));
}

function webpDimensions(view: DataView): Dimensions | null {
  if (view.byteLength < 30) return null;
  const chunk = String.fromCharCode(
    view.getUint8(12),
    view.getUint8(13),
    view.getUint8(14),
    view.getUint8(15),
  );
  if (chunk === "VP8X") {
    const read24 = (at: number) =>
      view.getUint8(at) |
      (view.getUint8(at + 1) << 8) |
      (view.getUint8(at + 2) << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  if (chunk === "VP8 ") {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

async function measure(entry: PortraitFile): Promise<Measured> {
  const absolute = path.join(PORTRAIT_DIR, entry.file);
  const [{ size }, buffer] = await Promise.all([
    fs.stat(absolute),
    fs.readFile(absolute),
  ]);
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const dimensions =
    entry.extension === "png"
      ? pngDimensions(view)
      : entry.extension === "webp"
        ? webpDimensions(view)
        : jpegDimensionsAt(view, 0);
  return { ...entry, bytes: size, ...dimensions };
}

/** Every frontmatter field in the repo that points at a character slug. */
function inboundReferences({
  characters,
  houses,
  weapons,
  dragons,
  battles,
}: {
  characters: Awaited<ReturnType<typeof loadAllCharacters>>;
  houses: Awaited<ReturnType<typeof loadAllHouses>>;
  weapons: Awaited<ReturnType<typeof loadAllWeapons>>;
  dragons: Awaited<ReturnType<typeof loadAllDragons>>;
  battles: Awaited<ReturnType<typeof loadAllBattles>>;
}): Map<string, number> {
  const referenced = [
    ...characters.flatMap(({ frontmatter }) => [
      ...frontmatter.parents,
      ...frontmatter.spouses,
      ...frontmatter.children,
      ...frontmatter.mentions,
    ]),
    ...houses.flatMap(({ frontmatter }) => [
      ...(frontmatter.heads ?? []).map((head) => head.slug),
      ...(frontmatter["notable-members"] ?? []).map((member) => member.slug),
      ...frontmatter.mentions,
    ]),
    ...weapons.flatMap(({ frontmatter }) => [
      ...frontmatter.wielders,
      ...frontmatter.mentions,
    ]),
    ...dragons.flatMap(({ frontmatter }) => [
      ...frontmatter.riders,
      ...frontmatter.mentions,
    ]),
    ...battles.flatMap(({ frontmatter }) => frontmatter.commanders),
  ];
  return referenced.reduce<Map<string, number>>(
    (counts, slug) => counts.set(slug, (counts.get(slug) ?? 0) + 1),
    new Map(),
  );
}

const json = Bun.argv.includes("--json");

const [files, characters, houses, weapons, dragons, battles] =
  await Promise.all([
    loadPortraitFiles(),
    loadAllCharacters(),
    loadAllHouses(),
    loadAllWeapons(),
    loadAllDragons(),
    loadAllBattles(),
  ]);

const measured = await Promise.all(files.map(measure));
const characterSlugs = new Set(characters.map((c) => c.frontmatter.slug));
const byStem = groupByStem(files);
const covered = coveredSlugs({ files, characterSlugs });

/** Characters that actually render: drafts and placeholders get no page. */
const rendered = characters.filter(
  (c) => !c.frontmatter.draft && !c.frontmatter.placeholder,
);
const renderedCovered = rendered.filter((c) => covered.has(c.frontmatter.slug));

const orphans = [...byStem.entries()]
  .filter(([stem]) => !characterSlugs.has(stem) && !PLACEHOLDER_STEMS.has(stem))
  .map(([stem, candidates]) => ({
    stem,
    reserved: RESERVED_PORTRAITS.has(stem),
    nearest: nearestSlug({ stem, characterSlugs, coveredSlugs: covered }),
    files: candidates
      .map((entry) => measured.find((m) => m.file === entry.file))
      .filter((entry) => !!entry),
  }))
  .sort((a, b) => a.stem.localeCompare(b.stem));

const duplicates = [...byStem.entries()]
  .filter(([stem]) => characterSlugs.has(stem))
  .flatMap(([stem, candidates]) => {
    const probed = candidates.filter((entry) =>
      isProbedExtension(entry.extension),
    );
    const winner = winningFile({ candidates: probed });
    if (!winner || probed.length < 2) return [];
    return [
      {
        stem,
        winner: winner.file,
        losers: probed
          .filter((entry) => entry.file !== winner.file)
          .map((entry) => measured.find((m) => m.file === entry.file))
          .filter((entry) => !!entry),
      },
    ];
  });

const resolved = measured.filter(
  (entry) =>
    (characterSlugs.has(entry.stem) || PLACEHOLDER_STEMS.has(entry.stem)) &&
    isProbedExtension(entry.extension) &&
    winningFile({ candidates: byStem.get(entry.stem) ?? [] })?.file ===
      entry.file,
);

const widthCeiling = Math.round(MAX_RENDERED_WIDTH * WIDTH_TOLERANCE);

const oversized = resolved
  .filter(
    (entry) => entry.bytes > HEAVY_BYTES || (entry.width ?? 0) > widthCeiling,
  )
  .sort((a, b) => b.bytes - a.bytes);

const offAspect = resolved
  .filter((entry) => {
    if (!entry.width || !entry.height) return false;
    return (
      Math.abs(entry.width / entry.height - TARGET_ASPECT) > ASPECT_TOLERANCE
    );
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const unreadable = measured.filter((entry) => !entry.width || !entry.height);

const references = inboundReferences({
  characters,
  houses,
  weapons,
  dragons,
  battles,
});

const uncovered = rendered
  .filter((c) => !covered.has(c.frontmatter.slug))
  .map((c) => ({
    slug: c.frontmatter.slug,
    name: c.frontmatter.name,
    house: c.frontmatter["primary-house"],
    references: references.get(c.frontmatter.slug) ?? 0,
  }))
  .sort((a, b) => b.references - a.references || a.slug.localeCompare(b.slug));

const errors = portraitIntegrityErrors({ files, characterSlugs });

const kb = (bytes: number) => `${Math.round(bytes / 1000)}KB`;
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)}MB`;
const pct = (part: number, whole: number) =>
  `${((part / whole) * 100).toFixed(1)}%`;
const box = (entry: Measured) =>
  entry.width && entry.height ? `${entry.width}x${entry.height}` : "unreadable";
const totalBytes = measured.reduce((sum, entry) => sum + entry.bytes, 0);
const reclaimable = [
  ...orphans.filter((group) => !group.reserved).flatMap((group) => group.files),
  ...duplicates.flatMap((group) => group.losers),
].reduce((sum, entry) => sum + entry.bytes, 0);

if (json) {
  console.log(
    JSON.stringify(
      {
        coverage: {
          renderedCharacters: rendered.length,
          totalCharacters: characters.length,
          dedicated: renderedCovered.length,
          placeholder: rendered.length - renderedCovered.length,
          files: files.length,
          bytes: totalBytes,
        },
        orphans: orphans.map((group) => ({
          stem: group.stem,
          reserved: group.reserved,
          nearest: group.nearest,
          files: group.files.map((entry) => ({
            file: entry.file,
            bytes: entry.bytes,
            width: entry.width ?? null,
            height: entry.height ?? null,
          })),
        })),
        duplicates: duplicates.map((group) => ({
          stem: group.stem,
          winner: group.winner,
          losers: group.losers.map((entry) => ({
            file: entry.file,
            bytes: entry.bytes,
          })),
        })),
        oversized: oversized.map((entry) => ({
          file: entry.file,
          bytes: entry.bytes,
          width: entry.width ?? null,
          height: entry.height ?? null,
        })),
        offAspect: offAspect.map((entry) => ({
          file: entry.file,
          width: entry.width ?? null,
          height: entry.height ?? null,
        })),
        unreadable: unreadable.map((entry) => entry.file),
        uncovered,
        reclaimableBytes: reclaimable,
        integrityErrors: errors,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `COVERAGE\n` +
      `  ${renderedCovered.length}/${rendered.length} rendered characters ` +
      `(${pct(renderedCovered.length, rendered.length)}) have dedicated art\n` +
      `  ${rendered.length - renderedCovered.length} fall back to the ` +
      `10-file placeholder pool\n` +
      `  ${characters.length} character entries total, ` +
      `${characters.length - rendered.length} draft or placeholder\n` +
      `  ${files.length} files, ${mb(totalBytes)} in public/characters/`,
  );

  console.log(`\nORPHANS (${orphans.length})`);
  console.log(
    orphans.length === 0
      ? "  none"
      : orphans
          .map((group) => {
            const bytes = group.files.reduce(
              (sum, entry) => sum + entry.bytes,
              0,
            );
            const verdict = group.reserved
              ? "RESERVED, staged ahead of its content entry"
              : group.nearest
                ? `near miss, rename to ${group.nearest}`
                : "no slug is close enough to be a typo";
            return `  ${kb(bytes)}  ${group.files
              .map((entry) => entry.file)
              .join(", ")}\n          ${verdict}`;
          })
          .join("\n"),
  );

  console.log(`\nDUPLICATES (${duplicates.length})`);
  console.log(
    duplicates.length === 0
      ? "  none"
      : duplicates
          .map(
            (group) =>
              `  ${group.stem}: findPortrait returns ${group.winner}; ` +
              `dead weight ${group.losers
                .map((entry) => `${entry.file} (${kb(entry.bytes)})`)
                .join(", ")}`,
          )
          .join("\n"),
  );

  console.log(
    `\nOVERSIZED (${oversized.length} over ${kb(HEAVY_BYTES)} or ${widthCeiling}px wide)`,
  );
  console.log(
    oversized.length === 0
      ? "  none"
      : oversized
          .map((entry) => `  ${kb(entry.bytes)}  ${box(entry)}  ${entry.file}`)
          .join("\n"),
  );

  console.log(
    `\nOFF-ASPECT (${offAspect.length} outside 3:2 +/- ${ASPECT_TOLERANCE})`,
  );
  console.log(
    offAspect.length === 0
      ? "  none"
      : offAspect.map((entry) => `  ${box(entry)}  ${entry.file}`).join("\n"),
  );

  if (unreadable.length > 0) {
    console.log(`\nUNREADABLE HEADERS (${unreadable.length})`);
    console.log(unreadable.map((entry) => `  ${entry.file}`).join("\n"));
  }

  console.log(
    `\nUNCOVERED, RANKED BY INBOUND REFERENCES (${uncovered.length})`,
  );
  console.log(
    uncovered
      .slice(0, 20)
      .map(
        (entry, index) =>
          `  ${String(index + 1).padStart(2)}  ${String(entry.references).padStart(3)}  ` +
          `${entry.slug}${entry.house ? `  (${entry.house})` : ""}`,
      )
      .join("\n"),
  );
  if (uncovered.length > 20) {
    console.log(`  ... ${uncovered.length - 20} more`);
  }

  console.log(
    `\nRECLAIMABLE NOW: ${kb(reclaimable)} in orphans and duplicate losers`,
  );
  console.log(`INTEGRITY ERRORS (${errors.length})`);
  console.log(
    errors.length === 0
      ? "  none, `bun test lib/portrait-integrity.test.ts` is green"
      : errors.map((error) => `  ${error}`).join("\n"),
  );
}
