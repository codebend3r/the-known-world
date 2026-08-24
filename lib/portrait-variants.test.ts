import { describe, it, expect, spyOn, beforeEach, afterAll } from "bun:test";
import fs from "node:fs/promises";
import {
  buildPortraitVariants,
  findPortraitVariants,
  variantLabel,
} from "@/lib/portrait-variants";

const access = spyOn(fs, "access");

afterAll(() => {
  access.mockRestore();
});

const DUNCAN = [
  "duncan-the-tall.jpg",
  "duncan-the-tall.mp4",
  "duncan-the-tall-kingsguard.jpg",
  "duncan-the-tall-kingsguard.mp4",
];

function build(files: string[]) {
  return buildPortraitVariants({
    slug: "duncan-the-tall",
    name: "Duncan the Tall",
    files,
  });
}

describe("variantLabel", () => {
  it("humanises the suffix after the slug", () => {
    expect(
      variantLabel({
        slug: "duncan-the-tall",
        stem: "duncan-the-tall-kingsguard",
      }),
    ).toBe("Kingsguard");
  });

  it("treats a doubled hyphen as separator, not label", () => {
    expect(
      variantLabel({
        slug: "aegon-ii-targaryen",
        stem: "aegon-ii-targaryen--after-burned",
      }),
    ).toBe("After Burned");
  });

  it("humanises a multi-word suffix", () => {
    expect(
      variantLabel({ slug: "arya-stark", stem: "arya-stark-no-one" }),
    ).toBe("No One");
  });
});

describe("buildPortraitVariants", () => {
  it("pairs each still with its clip and labels the primary with the name", () => {
    expect(build(DUNCAN)).toEqual([
      {
        id: "duncan-the-tall",
        label: "Duncan the Tall",
        image: "/characters/duncan-the-tall/duncan-the-tall.jpg",
        video: "/characters/duncan-the-tall/duncan-the-tall.mp4",
        isPrimary: true,
      },
      {
        id: "duncan-the-tall-kingsguard",
        label: "Kingsguard",
        image: "/characters/duncan-the-tall/duncan-the-tall-kingsguard.jpg",
        video: "/characters/duncan-the-tall/duncan-the-tall-kingsguard.mp4",
        isPrimary: false,
      },
    ]);
  });

  it("puts the primary first however the folder is listed", () => {
    const reversed = build([...DUNCAN].reverse());
    expect(reversed[0]?.id).toBe("duncan-the-tall");
  });

  it("orders the remaining variants by label", () => {
    const variants = build([
      "duncan-the-tall.jpg",
      "duncan-the-tall-kingsguard.jpg",
      "duncan-the-tall-ashford.jpg",
    ]);
    expect(variants.map((variant) => variant.label)).toEqual([
      "Duncan the Tall",
      "Ashford",
      "Kingsguard",
    ]);
  });

  it("follows the PORTRAIT_EXTENSIONS probe order within a variant", () => {
    const variants = build([
      "duncan-the-tall.jpeg",
      "duncan-the-tall.png",
      "duncan-the-tall.jpg",
    ]);
    expect(variants[0]?.image).toBe(
      "/characters/duncan-the-tall/duncan-the-tall.png",
    );
  });

  it("leaves video null when a variant has no clip", () => {
    expect(build(["duncan-the-tall.jpg"])[0]?.video).toBeNull();
  });

  it("drops a clip with no still of its own", () => {
    const variants = build([
      "duncan-the-tall.jpg",
      "duncan-the-tall-kingsguard.mp4",
    ]);
    expect(variants).toHaveLength(1);
  });

  it("ignores files belonging to another character", () => {
    const variants = build(["duncan-the-tall.jpg", "eddard-stark.jpg"]);
    expect(variants.map((variant) => variant.id)).toEqual(["duncan-the-tall"]);
  });

  it("ignores dotfiles", () => {
    const variants = build([".DS_Store", "duncan-the-tall.jpg"]);
    expect(variants).toHaveLength(1);
  });

  it("promotes the first variant when the folder has no primary still", () => {
    const variants = build([
      "duncan-the-tall-kingsguard.jpg",
      "duncan-the-tall-ashford.jpg",
    ]);
    expect(variants[0]).toMatchObject({
      id: "duncan-the-tall-ashford",
      isPrimary: true,
    });
    expect(variants[1]?.isPrimary).toBe(false);
  });

  it("returns nothing for an empty folder", () => {
    expect(build([])).toEqual([]);
  });
});

// `fs.readdir` is overloaded, and a spy has to satisfy every call signature at
// once, so these read the real `public/characters/` rather than a mock. Duncan
// is the folder the feature was built on; `fs.access` still stands in for the
// flat probes, which have one signature.
describe("findPortraitVariants", () => {
  beforeEach(() => {
    access.mockReset();
    access.mockImplementation(() => Promise.reject(new Error("ENOENT")));
  });

  it("reads every variant out of the character's folder", async () => {
    const variants = await findPortraitVariants({
      slug: "duncan-the-tall",
      name: "Duncan the Tall",
      sex: "m",
    });
    expect(variants[0]).toMatchObject({
      id: "duncan-the-tall",
      label: "Duncan the Tall",
      isPrimary: true,
    });
    expect(variants.map((variant) => variant.label)).toContain("Kingsguard");
  });

  it("falls back to the flat portrait when there is no folder", async () => {
    access.mockImplementation((p) =>
      String(p).endsWith("/public/characters/jon-snow.jpg")
        ? Promise.resolve()
        : Promise.reject(new Error("ENOENT")),
    );
    expect(
      await findPortraitVariants({
        slug: "jon-snow",
        name: "Jon Snow",
        sex: "m",
      }),
    ).toEqual([
      {
        id: "jon-snow",
        label: "Jon Snow",
        image: "/characters/jon-snow.jpg",
        video: null,
        isPrimary: true,
      },
    ]);
  });

  it("falls back to the placeholder when a character has no art at all", async () => {
    const [only] = await findPortraitVariants({
      slug: "nobody-at-all",
      name: "Nobody",
      sex: "f",
    });
    expect(only?.image).toMatch(/^\/characters\/unknown-female-0[1-5]\.jpg$/);
    expect(only?.isPrimary).toBe(true);
  });
});
