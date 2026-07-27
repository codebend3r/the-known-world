import { InfoEntry } from "game-of-thrones-atlas";

// One item in an infobox list: a linked name when its slug resolves (via
// hrefPrefix + optional `exists`), otherwise plain text, with an optional
// parenthetical note. Compose inside a <ul>.
export const Linked = () => (
  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
    <InfoEntry
      entry={{ slug: "eddard-stark", name: "Eddard Stark", note: "the Ned" }}
      hrefPrefix="/characters"
    />
    <InfoEntry
      entry={{ slug: "brandon-stark", name: "Brandon Stark" }}
      hrefPrefix="/characters"
    />
    <InfoEntry
      entry={{ slug: "lyanna-stark", name: "Lyanna Stark" }}
      hrefPrefix="/characters"
    />
  </ul>
);

export const PlainText = () => (
  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
    <InfoEntry entry={{ name: "The Night King", note: "unconfirmed" }} />
  </ul>
);
