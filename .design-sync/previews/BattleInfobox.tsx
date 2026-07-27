import { BattleInfobox } from "game-of-thrones-atlas";

// The wiki-style fact panel for a battle. Reads a Battle object plus lookup
// Maps (houses/characters by slug); empty Maps just mean names aren't linked.
const blackwater = {
  slug: "battle-of-the-blackwater",
  name: "Battle of the Blackwater",
  type: "battle",
  war: "War of the Five Kings",
  start: { year: 299, era: "AC", precision: "year" },
  end: { year: 299, era: "AC", precision: "year" },
  location: "kings-landing",
  participants: [
    { side: "attackers", houses: ["baratheon-of-dragonstone"] },
    { side: "defenders", houses: ["lannister", "tyrell"] },
  ],
  commanders: ["stannis-baratheon", "tyrion-lannister"],
  victor: "house-lannister",
  outcome:
    "Lannister-Tyrell victory; Stannis is routed after his fleet burns in wildfire.",
  casualties: [],
  aliases: ["Battle of the Blackwater Rush"],
  mentions: [],
  sources: [],
};

const empty = new Map();

export const Blackwater = () => (
  <div style={{ maxWidth: "26rem" }}>
    <BattleInfobox
      battle={blackwater}
      housesBySlug={empty}
      charactersBySlug={empty}
    />
  </div>
);
