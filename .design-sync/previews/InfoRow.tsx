import { InfoRow } from "game-of-thrones-atlas";

// A labeled row inside an infobox definition list: a <dt> label and a <dd>
// list of entries. Renders nothing when `entries` is empty. Compose in a <dl>.
export const Titles = () => (
  <dl style={{ margin: 0, maxWidth: "24rem" }}>
    <InfoRow
      label="Titles"
      entries={[
        { name: "Warden of the North" },
        { name: "Lord of Winterfell" },
        { name: "King in the North", note: "formerly" },
      ]}
    />
  </dl>
);

export const LinkedEntries = () => (
  <dl style={{ margin: 0, maxWidth: "24rem" }}>
    <InfoRow
      label="Ancestral weapons"
      entries={[{ slug: "ice", name: "Ice" }]}
      hrefPrefix="/weapons"
    />
  </dl>
);
