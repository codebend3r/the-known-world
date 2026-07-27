import { HouseInfobox } from "game-of-thrones-atlas";

// HouseInfobox composes a Sigil with a definition-list of house facts. It
// reads lookup Maps (castles/characters/houses/weapons by slug) and a list of
// the house's dragons; empty Maps just mean names aren't linked. The sigil
// image resolves from /sigils and is not served in this environment, so the
// crest frame shows empty here (see NOTES.md).
const stark = {
  slug: "stark",
  name: "House Stark of Winterfell",
  seat: "winterfell",
  liege: null,
  words: "Winter Is Coming",
  sigil: {
    description: "A running grey direwolf on a white field",
    provenance: "canon",
  },
  rank: "royal",
  founded: { year: 0, era: "age-of-heroes", precision: "era" },
  status: "extant",
  region: "north",
  seats: [{ slug: "winterfell", name: "Winterfell" }],
  heads: [{ slug: "eddard-stark", name: "Eddard Stark" }],
  regions: [{ name: "The North" }],
  titles: [
    { name: "King in the North" },
    { name: "Warden of the North" },
    { name: "Lord of Winterfell" },
  ],
  "cadet-houses": ["karstark", "greystark"],
  "ancestral-weapons": ["ice"],
  sources: [],
};

const empty = new Map();

export const HouseStark = () => (
  <div style={{ maxWidth: "26rem" }}>
    <HouseInfobox
      house={stark}
      castlesBySlug={empty}
      charactersBySlug={empty}
      housesBySlug={empty}
      weaponsBySlug={empty}
      dragonsForHouse={[]}
    />
  </div>
);
