import { WeaponInfobox } from "game-of-thrones-atlas";

// The fact panel for an ancestral weapon. The origin-house crest only renders
// when that house resolves in `housesBySlug`; empty Maps keep the card to its
// fact list (and avoid the unavailable /sigils image). See NOTES.md.
const ice = {
  slug: "ice",
  name: "Ice",
  type: "greatsword",
  material: "valyrian-steel",
  forged: { year: 400, era: "BC", precision: "era" },
  destroyed: { year: 300, era: "AC", precision: "year" },
  status: "destroyed",
  "origin-house": "stark",
  "current-house": null,
  wielders: ["eddard-stark", "rickard-stark"],
  aliases: [],
  mentions: [],
  sources: [],
};

const empty = new Map();

export const Ice = () => (
  <div style={{ maxWidth: "26rem" }}>
    <WeaponInfobox weapon={ice} housesBySlug={empty} charactersBySlug={empty} />
  </div>
);
