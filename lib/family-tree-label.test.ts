import { describe, it, expect } from "vitest";
import {
  estimateLabelWidth,
  formatLabelText,
  formatLifespan,
  formatTitle,
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

describe("formatTitle", () => {
  it("appends the alias in parentheses when present", () => {
    expect(formatTitle({ name: "Petyr Baelish", alias: "Littlefinger" })).toBe(
      "Petyr Baelish (Littlefinger)",
    );
  });

  it("returns just the name when there is no alias", () => {
    expect(formatTitle({ name: "Eddard Stark", alias: null })).toBe(
      "Eddard Stark",
    );
  });
});

describe("formatLifespan", () => {
  it("joins born and died years with an en dash", () => {
    expect(formatLifespan({ born: 262, died: 299 })).toBe("262–299");
  });

  it("leaves an open range when the death year is unknown", () => {
    expect(formatLifespan({ born: 262, died: null })).toBe("262–");
  });

  it("uses a question mark for an unknown birth year", () => {
    expect(formatLifespan({ born: null, died: 299 })).toBe("?–299");
  });

  it("returns null when both years are unknown", () => {
    expect(formatLifespan({ born: null, died: null })).toBeNull();
  });
});
