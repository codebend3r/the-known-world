import { describe, it, expect } from "vitest";
import { findBattleImage } from "@/lib/battle-image";

describe("findBattleImage", () => {
  it("returns the public path when a battle has an image", async () => {
    expect(await findBattleImage("first-battle-of-the-last-storm")).toBe(
      "/battles/first-battle-of-the-last-storm.jpg",
    );
  });

  it("returns null when the battle has no image", async () => {
    expect(await findBattleImage("no-such-battle-slug-xyz")).toBeNull();
  });
});
