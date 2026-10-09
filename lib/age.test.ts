import { describe, it, expect } from "bun:test";
import { ageAtDeath } from "@/lib/age";

describe("ageAtDeath", () => {
  it("subtracts year-precision AC dates", () => {
    expect(
      ageAtDeath({
        born: { year: 259, era: "AC", precision: "year" },
        died: { year: 299, era: "AC", precision: "year" },
      }),
    ).toBe(40);
  });

  it("handles a BC birth crossing into AC", () => {
    expect(
      ageAtDeath({
        born: { year: 27, era: "BC", precision: "year" },
        died: { year: 37, era: "AC", precision: "year" },
      }),
    ).toBe(64);
  });

  it("subtracts two BC dates on the signed axis", () => {
    expect(
      ageAtDeath({
        born: { year: 40, era: "BC", precision: "year" },
        died: { year: 2, era: "BC", precision: "year" },
      }),
    ).toBe(38);
  });

  it("returns null when born is null", () => {
    expect(
      ageAtDeath({
        born: null,
        died: { year: 299, era: "AC", precision: "year" },
      }),
    ).toBeNull();
  });

  it("returns null when died is null (still alive)", () => {
    expect(
      ageAtDeath({
        born: { year: 259, era: "AC", precision: "year" },
        died: null,
      }),
    ).toBeNull();
  });

  it("returns null when either date uses a non-AC/BC era", () => {
    expect(
      ageAtDeath({
        born: { year: 0, era: "age-of-heroes", precision: "era" },
        died: { year: 1, era: "AC", precision: "year" },
      }),
    ).toBeNull();
  });

  it("returns null when either date is only decade-precise", () => {
    expect(
      ageAtDeath({
        born: { year: 260, era: "AC", precision: "decade" },
        died: { year: 299, era: "AC", precision: "year" },
      }),
    ).toBeNull();
  });

  it("returns null when death precedes birth", () => {
    expect(
      ageAtDeath({
        born: { year: 300, era: "AC", precision: "year" },
        died: { year: 280, era: "AC", precision: "year" },
      }),
    ).toBeNull();
  });
});
