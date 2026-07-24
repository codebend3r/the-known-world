import { DragonInfobox } from "game-of-thrones-atlas";

// The fact panel for a dragon. The house crest only renders when the house
// resolves in `housesBySlug`; passing empty Maps keeps the card to its fact
// list (and avoids the unavailable /sigils image). See NOTES.md.
const balerion = {
  slug: "balerion",
  name: "Balerion",
  color: "Black",
  size: "monstrous",
  hatched: { year: 100, era: "BC", precision: "decade" },
  died: { year: 94, era: "AC", precision: "year" },
  status: "dead",
  house: "targaryen",
  riders: ["aegon-i-targaryen", "maegor-i-targaryen"],
  aliases: ["The Black Dread"],
  mentions: [],
  sources: [],
};

const empty = new Map();

export const BalerionTheBlackDread = () => (
  <div style={{ maxWidth: "26rem" }}>
    <DragonInfobox
      dragon={balerion}
      housesBySlug={empty}
      charactersBySlug={empty}
    />
  </div>
);
