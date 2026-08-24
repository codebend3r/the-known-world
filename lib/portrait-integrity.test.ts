import { describe, expect, it } from "bun:test";
import { loadAllCharacters } from "@/lib/content";
import {
  coveredSlugs,
  editDistance,
  groupByStem,
  loadPortraitFiles,
  loadPortraitVariantDirs,
  nearestSlug,
  PLACEHOLDER_FILES,
  portraitIntegrityErrors,
  RESERVED_PORTRAITS,
  variantDirErrors,
  winningFile,
  type PortraitFile,
} from "@/lib/portrait-integrity";

async function loadPortraitSources() {
  const [files, variantDirs, characters] = await Promise.all([
    loadPortraitFiles(),
    loadPortraitVariantDirs(),
    loadAllCharacters(),
  ]);
  return {
    files,
    variantDirs,
    characterSlugs: new Set(characters.map((entry) => entry.frontmatter.slug)),
  };
}

function portrait(file: string): PortraitFile {
  const dot = file.lastIndexOf(".");
  return {
    file,
    stem: file.slice(0, dot),
    extension: file.slice(dot + 1).toLowerCase(),
  };
}

describe("portrait integrity", () => {
  it("resolves every file in public/characters to a slug or the fallback pool", async () => {
    expect(portraitIntegrityErrors(await loadPortraitSources())).toEqual([]);
  });

  it("keeps all ten placeholder variants on disk", async () => {
    const { files } = await loadPortraitSources();
    const onDisk = new Set(files.map((entry) => entry.file));
    expect([...PLACEHOLDER_FILES].filter((file) => !onDisk.has(file))).toEqual(
      [],
    );
  });

  it("ignores portraits reserved ahead of their content entry", async () => {
    const sources = await loadPortraitSources();
    const reserved = [...RESERVED_PORTRAITS];
    expect(reserved.length).toBeGreaterThan(0);
    reserved.forEach((stem) => {
      expect(sources.characterSlugs.has(stem)).toBe(false);
      expect(groupByStem(sources.files).has(stem)).toBe(true);
    });
    expect(portraitIntegrityErrors(sources)).toEqual([]);
  });

  it("flags a file whose stem matches no character slug", async () => {
    const sources = await loadPortraitSources();
    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait("qqqzzz-nobody.jpg")],
      }),
    ).toEqual([
      "characters/qqqzzz-nobody.jpg: no content/characters/qqqzzz-nobody.md, and no slug is close enough to be a typo",
    ]);
  });

  it("names the intended slug when the filename is a near miss", async () => {
    const sources = await loadPortraitSources();
    const covered = coveredSlugs(sources);
    const slug = [...sources.characterSlugs]
      .sort()
      .find((candidate) => !covered.has(candidate) && candidate.length > 8);
    if (!slug) throw new Error("expected an uncovered character slug");
    const typo = `${slug.slice(0, -1)}x`;
    if (sources.characterSlugs.has(typo)) throw new Error("typo collided");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait(`${typo}.jpg`)],
      }),
    ).toEqual([
      `characters/${typo}.jpg: no content/characters/${typo}.md; closest slug is ${slug}, rename or delete it`,
    ]);
  });

  it("flags the losing file when one slug has two probed extensions", async () => {
    const sources = await loadPortraitSources();
    const existing = sources.files.find((entry) =>
      sources.characterSlugs.has(entry.stem),
    );
    if (!existing) throw new Error("expected a resolved portrait");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait(`${existing.stem}.png`)],
      }),
    ).toEqual([
      `characters/${existing.file}: dead weight, findPortrait returns ${existing.stem}.png for ${existing.stem} first`,
    ]);
  });

  it("flags an extension no finder ever probes", async () => {
    const sources = await loadPortraitSources();
    const existing = sources.files.find((entry) =>
      sources.characterSlugs.has(entry.stem),
    );
    if (!existing) throw new Error("expected a resolved portrait");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait(`${existing.stem}.gif`)],
      }),
    ).toEqual([
      `characters/${existing.stem}.gif: extension .gif is in neither PORTRAIT_EXTENSIONS nor PORTRAIT_VIDEO_EXTENSIONS, no finder can ever return it`,
    ]);
  });

  it("accepts a portrait video sitting beside a slug's still", async () => {
    const sources = await loadPortraitSources();
    const existing = sources.files.find(
      (entry) =>
        sources.characterSlugs.has(entry.stem) && entry.extension !== "mp4",
    );
    if (!existing) throw new Error("expected a resolved portrait");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait(`${existing.stem}.mp4`)],
      }),
    ).toEqual([]);
  });

  it("flags a video whose stem matches no character slug", async () => {
    const sources = await loadPortraitSources();
    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait("qqqzzz-nobody.mp4")],
      }),
    ).toEqual([
      "characters/qqqzzz-nobody.mp4: no content/characters/qqqzzz-nobody.md, and no slug is close enough to be a typo",
    ]);
  });

  it("flags a missing placeholder variant", async () => {
    const sources = await loadPortraitSources();
    const [dropped] = [...PLACEHOLDER_FILES].sort();
    if (!dropped) throw new Error("expected a placeholder file");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: sources.files.filter((entry) => entry.file !== dropped),
      }),
    ).toEqual([
      `characters/${dropped}: missing, required by the placeholder fallback`,
    ]);
  });

  it("flags a reservation whose content entry now exists", async () => {
    const sources = await loadPortraitSources();
    const [reserved] = [...RESERVED_PORTRAITS].sort();
    if (!reserved) throw new Error("expected a reserved portrait");

    expect(
      portraitIntegrityErrors({
        ...sources,
        characterSlugs: new Set([...sources.characterSlugs, reserved]),
      }),
    ).toEqual([
      `RESERVED_PORTRAITS ${reserved}: content/characters/${reserved}.md now exists, drop it from the list`,
    ]);
  });
});

describe("variantDirErrors", () => {
  const characterSlugs = new Set(["duncan-the-tall", "eddard-stark"]);

  function dir(files: string[]) {
    return { slug: "duncan-the-tall", files: files.map(portrait) };
  }

  it("accepts a folder holding a primary and a suffixed variant", () => {
    expect(
      variantDirErrors({
        dir: dir([
          "duncan-the-tall.jpg",
          "duncan-the-tall.mp4",
          "duncan-the-tall-kingsguard.jpg",
          "duncan-the-tall-kingsguard.mp4",
        ]),
        characterSlugs,
      }),
    ).toEqual([]);
  });

  it("flags a folder that names no character", () => {
    expect(
      variantDirErrors({
        dir: { slug: "edard-stark", files: [portrait("edard-stark.jpg")] },
        characterSlugs,
      }),
    ).toEqual([
      "characters/edard-stark/: no content/characters/edard-stark.md; closest slug is eddard-stark, rename or delete the folder",
    ]);
  });

  it("flags a file whose stem belongs to another character", () => {
    expect(
      variantDirErrors({
        dir: dir(["duncan-the-tall.jpg", "eddard-stark.jpg"]),
        characterSlugs,
      }),
    ).toEqual([
      "characters/duncan-the-tall/eddard-stark.jpg: stem is neither duncan-the-tall nor duncan-the-tall-<variant>, no variant can ever return it",
    ]);
  });

  it("flags a folder with no primary still", () => {
    expect(
      variantDirErrors({
        dir: dir(["duncan-the-tall-kingsguard.jpg"]),
        characterSlugs,
      }),
    ).toEqual([
      "characters/duncan-the-tall/: no duncan-the-tall.<ext> still, so findPortrait falls back to a placeholder",
    ]);
  });

  it("flags a variant clip with no still to hang on", () => {
    expect(
      variantDirErrors({
        dir: dir(["duncan-the-tall.jpg", "duncan-the-tall-kingsguard.mp4"]),
        characterSlugs,
      }),
    ).toEqual([
      "characters/duncan-the-tall/duncan-the-tall-kingsguard.mp4: no duncan-the-tall-kingsguard.<ext> still, so the duncan-the-tall-kingsguard variant never renders",
    ]);
  });

  it("flags the losing file when one variant has two probed extensions", () => {
    expect(
      variantDirErrors({
        dir: dir(["duncan-the-tall.jpg", "duncan-the-tall.png"]),
        characterSlugs,
      }),
    ).toEqual([
      "characters/duncan-the-tall/duncan-the-tall.jpg: dead weight, duncan-the-tall resolves to duncan-the-tall.png first",
    ]);
  });

  it("flags an extension no finder ever probes", () => {
    expect(
      variantDirErrors({
        dir: dir(["duncan-the-tall.jpg", "duncan-the-tall-kingsguard.gif"]),
        characterSlugs,
      }),
    ).toEqual([
      "characters/duncan-the-tall/duncan-the-tall-kingsguard.gif: extension .gif is in neither PORTRAIT_EXTENSIONS nor PORTRAIT_VIDEO_EXTENSIONS, no finder can ever return it",
    ]);
  });
});

describe("variant folders shadowed by a flat file", () => {
  it("flags a folder that findPortrait can never reach", async () => {
    const sources = await loadPortraitSources();
    const [dir] = sources.variantDirs;
    if (!dir) throw new Error("expected a variant folder on disk");

    expect(
      portraitIntegrityErrors({
        ...sources,
        files: [...sources.files, portrait(`${dir.slug}.jpg`)],
      }),
    ).toEqual([
      `characters/${dir.slug}/: shadowed by the flat characters/${dir.slug} file, which findPortrait returns first`,
    ]);
  });
});

describe("winningFile", () => {
  it("follows the PORTRAIT_EXTENSIONS probe order", () => {
    const candidates = [
      portrait("a.jpeg"),
      portrait("a.jpg"),
      portrait("a.webp"),
      portrait("a.png"),
    ];
    expect(winningFile({ candidates })?.file).toBe("a.png");
    expect(
      winningFile({
        candidates: candidates.filter((entry) => entry.extension !== "png"),
      })?.file,
    ).toBe("a.webp");
  });

  it("returns null when nothing is probed", () => {
    expect(winningFile({ candidates: [portrait("a.gif")] })).toBeNull();
    expect(winningFile({ candidates: [] })).toBeNull();
  });
});

describe("editDistance", () => {
  it("counts substitutions, insertions, and deletions", () => {
    expect(editDistance({ a: "kitten", b: "sitting", limit: 9 })).toBe(3);
    expect(editDistance({ a: "same", b: "same", limit: 9 })).toBe(0);
    expect(
      editDistance({ a: "vaemond-targaryen", b: "vaemond-velaryon", limit: 9 }),
    ).toBe(5);
  });

  it("bails out over the limit rather than computing an exact distance", () => {
    expect(editDistance({ a: "a", b: "abcdefghij", limit: 2 })).toBeGreaterThan(
      2,
    );
  });
});

describe("nearestSlug", () => {
  const characterSlugs = new Set([
    "aemond-targaryen",
    "vaegon-targaryen",
    "vaemond-velaryon",
    "eddard-stark",
  ]);

  it("matches a plausible typo", () => {
    expect(nearestSlug({ stem: "edard-stark", characterSlugs })).toBe(
      "eddard-stark",
    );
  });

  it("takes the closest slug when nothing is covered yet", () => {
    expect(nearestSlug({ stem: "vaemond-targaryen", characterSlugs })).toBe(
      "aemond-targaryen",
    );
  });

  it("skips slugs that already resolve to art of their own", () => {
    expect(
      nearestSlug({
        stem: "vaemond-targaryen",
        characterSlugs,
        coveredSlugs: new Set(["aemond-targaryen", "vaemond-velaryon"]),
      }),
    ).toBe("vaegon-targaryen");
  });

  it("falls back to a covered slug when no uncovered one is close", () => {
    expect(
      nearestSlug({
        stem: "edard-stark",
        characterSlugs,
        coveredSlugs: new Set(["eddard-stark"]),
      }),
    ).toBe("eddard-stark");
  });

  it("returns null for an unrelated name", () => {
    expect(nearestSlug({ stem: "thoros-of-myr", characterSlugs })).toBeNull();
  });

  it("returns null for a stem too short to have a tolerance", () => {
    expect(nearestSlug({ stem: "ab", characterSlugs })).toBeNull();
  });
});
