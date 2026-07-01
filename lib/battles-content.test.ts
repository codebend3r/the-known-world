import { describe, it, expect } from "vitest";
import { loadAllBattles } from "@/lib/content";

const toAbsoluteYear = (date: { year: number; era: string }): number =>
  date.era === "BC" ? -date.year : date.year;

describe("battles content corpus", () => {
  it("loads and validates every content/battles file against BattleSchema", async () => {
    const all = await loadAllBattles();
    expect(all.length).toBe(72);
  });

  it("keeps each file's frontmatter slug in sync with its filename", async () => {
    const all = await loadAllBattles();
    const mismatched = all.filter((b) => b.frontmatter.slug !== b.slug);
    expect(mismatched.map((b) => b.slug)).toEqual([]);
  });

  it("groups every battle under a war and publishes every populated entry", async () => {
    const all = await loadAllBattles();
    const missingWar = all.filter((b) => !b.frontmatter.war);
    const stillDraft = all.filter((b) => b.frontmatter.draft);
    expect(missingWar.map((b) => b.slug)).toEqual([]);
    expect(stillDraft.map((b) => b.slug)).toEqual([]);
  });

  it("gives every battle a populated prose body", async () => {
    const all = await loadAllBattles();
    const thin = all.filter((b) => b.body.trim().length < 200);
    expect(thin.map((b) => b.slug)).toEqual([]);
  });

  it("never ends a battle before it starts when both dates are exact", async () => {
    const all = await loadAllBattles();
    const reversed = all.filter((b) => {
      const { start, end } = b.frontmatter;
      if (start.precision !== "exact" || end.precision !== "exact")
        return false;
      return toAbsoluteYear(end) < toAbsoluteYear(start);
    });
    expect(reversed.map((b) => b.slug)).toEqual([]);
  });

  it("carries approximate (non-exact precision) dates for legendary battles", async () => {
    const all = await loadAllBattles();
    const approximate = all.filter(
      (b) => b.frontmatter.start.precision !== "exact",
    );
    expect(approximate.length).toBeGreaterThan(0);
  });
});
