import { describe, it, expect } from "vitest";
import {
  estimateLabelWidth,
  formatLabelText,
  wasKing,
} from "@/lib/family-tree-label";

describe("formatLabelText", () => {
  it("returns the first word for single-word names", () => {
    expect(formatLabelText("Varys", [])).toBe("Varys");
  });

  it("returns 'First L.' for multi-word non-kings", () => {
    expect(formatLabelText("Eddard Stark", [])).toBe("Eddard S.");
  });

  it("includes the regnal numeral for kings", () => {
    expect(
      formatLabelText("Aegon IV Targaryen", [
        "King of the Andals, the Rhoynar, and the First Men",
      ]),
    ).toBe("Aegon IV T.");
  });

  it("does not include the numeral for non-kings even if a middle word matches", () => {
    expect(formatLabelText("Some V Person", [])).toBe("Some P.");
  });
});

describe("wasKing", () => {
  it("returns true when any title starts with 'King '", () => {
    expect(wasKing(["King in the North"])).toBe(true);
    expect(wasKing(["Lord", "King of the Andals"])).toBe(true);
  });

  it("returns false for empty or non-king titles", () => {
    expect(wasKing([])).toBe(false);
    expect(wasKing(["Lord of Casterly Rock"])).toBe(false);
  });
});

describe("estimateLabelWidth", () => {
  it("scales with the rendered label length", () => {
    const short = estimateLabelWidth("Eddard Stark", []);
    const long = estimateLabelWidth("Daenerys Targaryen", []);
    expect(long).toBeGreaterThan(short);
  });

  it("matches `formatLabelText(name).length * char-width + 2*padding`", () => {
    const text = formatLabelText("Aegon IV Targaryen", ["King of the Andals"]);
    expect(
      estimateLabelWidth("Aegon IV Targaryen", ["King of the Andals"]),
    ).toBe(text.length * 5.5 + 12);
  });
});
