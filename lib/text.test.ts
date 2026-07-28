import { describe, it, expect } from "bun:test";
import {
  titleCase,
  humanizeSlug,
  shortHouseName,
  houseLabel,
} from "@/lib/text";

describe("titleCase", () => {
  it("capitalizes the first letter of each space-separated word", () => {
    expect(titleCase("the twins")).toBe("The Twins");
  });

  it("leaves already-capitalized words unchanged", () => {
    expect(titleCase("King's Landing")).toBe("King's Landing");
  });

  it("handles a single word", () => {
    expect(titleCase("riverrun")).toBe("Riverrun");
  });

  it("returns an empty string unchanged", () => {
    expect(titleCase("")).toBe("");
  });

  it("preserves double spaces without crashing on empty segments", () => {
    expect(titleCase("a  b")).toBe("A  B");
  });
});

describe("humanizeSlug", () => {
  it("turns a hyphenated slug into title-cased words", () => {
    expect(humanizeSlug("jon-snow")).toBe("Jon Snow");
  });

  it("handles multi-word slugs", () => {
    expect(humanizeSlug("iron-islands")).toBe("Iron Islands");
  });

  it("handles a single-token slug", () => {
    expect(humanizeSlug("stark")).toBe("Stark");
  });

  it("returns an empty string unchanged", () => {
    expect(humanizeSlug("")).toBe("");
  });
});

describe("shortHouseName", () => {
  it("strips a leading 'House ' prefix", () => {
    expect(shortHouseName("House Stark")).toBe("Stark");
  });

  it("matches the prefix case-insensitively", () => {
    expect(shortHouseName("house Targaryen")).toBe("Targaryen");
  });

  it("leaves a name without the prefix unchanged", () => {
    expect(shortHouseName("Targaryen")).toBe("Targaryen");
  });

  it("only strips the leading prefix, not later occurrences", () => {
    expect(shortHouseName("House of the Undying")).toBe("of the Undying");
  });
});

describe("houseLabel", () => {
  const housesBySlug = new Map([
    ["stark", { name: "House Stark" }],
    ["lannister", { name: "House Lannister" }],
  ]);

  it("returns the mapped house name when the slug is known", () => {
    expect(houseLabel({ slug: "stark", housesBySlug })).toBe("House Stark");
  });

  it("falls back to a humanized 'House <slug>' label when unknown", () => {
    expect(houseLabel({ slug: "clegane", housesBySlug })).toBe("House Clegane");
  });

  it("humanizes hyphenated slugs in the fallback", () => {
    expect(houseLabel({ slug: "iron-islands", housesBySlug })).toBe(
      "House Iron Islands",
    );
  });
});
