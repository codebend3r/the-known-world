import { describe, it, expect } from "bun:test";
import {
  formatBattleWhen,
  isApproximate,
  absoluteYear,
} from "@/lib/battle-date";

const d = (
  year: number,
  era: "AC" | "BC",
  precision: "exact" | "year" | "decade" | "era" | "legendary",
) => ({ year, era, precision });

describe("formatBattleWhen", () => {
  it("collapses a single-year exact battle with no asterisk", () => {
    expect(
      formatBattleWhen({
        start: d(283, "AC", "exact"),
        end: d(283, "AC", "exact"),
      }),
    ).toBe("283 AC");
  });

  it("renders a same-era range as 'X to Y'", () => {
    expect(
      formatBattleWhen({
        start: d(282, "AC", "exact"),
        end: d(283, "AC", "exact"),
      }),
    ).toBe("282 to 283 AC");
  });

  it("marks approximate (non-exact) dates with a trailing asterisk", () => {
    expect(
      formatBattleWhen({
        start: d(8000, "BC", "legendary"),
        end: d(8000, "BC", "legendary"),
      }),
    ).toBe("8000 BC*");
  });

  it("handles a BC range", () => {
    expect(
      formatBattleWhen({
        start: d(12000, "BC", "era"),
        end: d(10000, "BC", "era"),
      }),
    ).toBe("12000 to 10000 BC*");
  });
});

describe("isApproximate", () => {
  it("is false only for exact", () => {
    expect(isApproximate(d(1, "AC", "exact"))).toBe(false);
    expect(isApproximate(d(1, "AC", "year"))).toBe(true);
    expect(isApproximate(d(1, "AC", "legendary"))).toBe(true);
  });
});

describe("absoluteYear", () => {
  it("negates BC years for a single sort axis", () => {
    expect(absoluteYear(d(283, "AC", "exact"))).toBe(283);
    expect(absoluteYear(d(8000, "BC", "legendary"))).toBe(-8000);
  });
});
