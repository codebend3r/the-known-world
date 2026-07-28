import { describe, it, expect } from "bun:test";
import { formatEraDate } from "@/lib/era-date";
import type { CalendarDate } from "@/lib/schemas";

describe("formatEraDate", () => {
  it("returns an em dash for a null date", () => {
    expect(formatEraDate(null)).toBe("—");
  });

  it("formats AC years as '<year> AC'", () => {
    const date: CalendarDate = { year: 283, era: "AC", precision: "exact" };
    expect(formatEraDate(date)).toBe("283 AC");
  });

  it("formats BC years using the absolute year", () => {
    const date: CalendarDate = { year: -100, era: "BC", precision: "year" };
    expect(formatEraDate(date)).toBe("100 BC");
  });

  it("title-cases a hyphenated era label", () => {
    const date: CalendarDate = {
      year: 0,
      era: "targaryen-conquest",
      precision: "era",
    };
    expect(formatEraDate(date)).toBe("Targaryen Conquest");
  });

  it("appends a '(legendary)' suffix for legendary precision", () => {
    const date: CalendarDate = {
      year: 0,
      era: "age-of-heroes",
      precision: "legendary",
    };
    expect(formatEraDate(date)).toBe("Age Of Heroes (legendary)");
  });

  it("omits the suffix for non-legendary era dates", () => {
    const date: CalendarDate = { year: 0, era: "dawn-age", precision: "era" };
    expect(formatEraDate(date)).toBe("Dawn Age");
  });
});
