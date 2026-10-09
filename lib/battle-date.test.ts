import { describe, it, expect } from "bun:test";
import {
  formatBattleWhen,
  isApproximate,
  absoluteYear,
} from "@/lib/battle-date";

const d = ({
  year,
  era,
  precision,
}: {
  year: number;
  era: "AC" | "BC";
  precision: "exact" | "year" | "decade" | "era" | "legendary";
}) => ({ year, era, precision });

describe("formatBattleWhen", () => {
  it("collapses a single-year exact battle with no asterisk", () => {
    expect(
      formatBattleWhen({
        start: d({ year: 283, era: "AC", precision: "exact" }),
        end: d({ year: 283, era: "AC", precision: "exact" }),
      }),
    ).toBe("283 AC");
  });

  it("renders a same-era range as 'X to Y'", () => {
    expect(
      formatBattleWhen({
        start: d({ year: 282, era: "AC", precision: "exact" }),
        end: d({ year: 283, era: "AC", precision: "exact" }),
      }),
    ).toBe("282 to 283 AC");
  });

  it("marks approximate (non-exact) dates with a trailing asterisk", () => {
    expect(
      formatBattleWhen({
        start: d({ year: 8000, era: "BC", precision: "legendary" }),
        end: d({ year: 8000, era: "BC", precision: "legendary" }),
      }),
    ).toBe("8000 BC*");
  });

  it("handles a BC range", () => {
    expect(
      formatBattleWhen({
        start: d({ year: 12000, era: "BC", precision: "era" }),
        end: d({ year: 10000, era: "BC", precision: "era" }),
      }),
    ).toBe("12000 to 10000 BC*");
  });
});

describe("isApproximate", () => {
  it("is false only for exact", () => {
    expect(isApproximate(d({ year: 1, era: "AC", precision: "exact" }))).toBe(
      false,
    );
    expect(isApproximate(d({ year: 1, era: "AC", precision: "year" }))).toBe(
      true,
    );
    expect(
      isApproximate(d({ year: 1, era: "AC", precision: "legendary" })),
    ).toBe(true);
  });
});

describe("absoluteYear", () => {
  it("negates BC years for a single sort axis", () => {
    expect(absoluteYear(d({ year: 283, era: "AC", precision: "exact" }))).toBe(
      283,
    );
    expect(
      absoluteYear(d({ year: 8000, era: "BC", precision: "legendary" })),
    ).toBe(-8000);
  });
});
