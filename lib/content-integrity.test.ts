import { describe, expect, it } from "vitest";
import {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import { contentIntegrityErrors } from "@/lib/content-integrity";

describe("content integrity", () => {
  it("has matching, unique slugs and resolvable cross-references", async () => {
    const [battles, castles, characters, dragons, events, houses, weapons] =
      await Promise.all([
        loadAllBattles(),
        loadAllCastles(),
        loadAllCharacters(),
        loadAllDragons(),
        loadAllEvents(),
        loadAllHouses(),
        loadAllWeapons(),
      ]);

    expect(
      contentIntegrityErrors({
        battles,
        castles,
        characters,
        dragons,
        events,
        houses,
        weapons,
      }),
    ).toEqual([]);
  });
});
