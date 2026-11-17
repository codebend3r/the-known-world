import { describe, expect, it } from "bun:test";
import {
  describeFiles,
  groupByStem,
  isStemOfSlug,
  pickByExtension,
} from "@/lib/portrait-files";

describe("describeFiles", () => {
  it("drops dotfiles, splits stem from a lowercased extension, and sorts", () => {
    expect(describeFiles(["b.JPG", ".DS_Store", "a.tar.mp4", "c"])).toEqual([
      { file: "a.tar.mp4", stem: "a.tar", extension: "mp4" },
      { file: "b.JPG", stem: "b", extension: "jpg" },
      { file: "c", stem: "c", extension: "" },
    ]);
  });
});

describe("groupByStem", () => {
  it("collects every extension under its stem", () => {
    const groups = groupByStem(describeFiles(["a.jpg", "a.mp4", "b.png"]));
    expect([...groups.keys()]).toEqual(["a", "b"]);
    expect(groups.get("a")?.map((entry) => entry.file) ?? []).toEqual([
      "a.jpg",
      "a.mp4",
    ]);
  });
});

describe("pickByExtension", () => {
  it("returns the first candidate in extension order, not file order", () => {
    const candidates = describeFiles(["a.jpg", "a.png"]);
    expect(
      pickByExtension({ candidates, extensions: ["png", "jpg"] })?.file ?? null,
    ).toBe("a.png");
  });

  it("returns null when no extension matches", () => {
    expect(
      pickByExtension({
        candidates: describeFiles(["a.gif"]),
        extensions: ["png"],
      }),
    ).toBeNull();
  });
});

describe("isStemOfSlug", () => {
  it("accepts the primary and suffixed variants only", () => {
    expect(isStemOfSlug({ slug: "arya-stark", stem: "arya-stark" })).toBe(true);
    expect(
      isStemOfSlug({ slug: "arya-stark", stem: "arya-stark-no-one" }),
    ).toBe(true);
    expect(isStemOfSlug({ slug: "arya-stark", stem: "arya-starkling" })).toBe(
      false,
    );
  });
});
