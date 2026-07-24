import { PageHeading } from "game-of-thrones-atlas";

// The shared page title block: an h1 (optionally led by a section glyph), an
// optional italic subtitle, and the ornamental FiligreeRule underline.
export const Default = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <PageHeading
      title="The Great Houses"
      subtitle="Nine dominions of the Seven Kingdoms, from the Wall to the Sea of Dorne."
    />
  </div>
);

export const WithGlyph = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <PageHeading
      title="Castles of Westeros"
      subtitle="Keeps, holdfasts, and ruined watchtowers charted across the realm."
      icon={<span aria-hidden="true">⚔</span>}
    />
  </div>
);

export const TitleOnly = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <PageHeading title="Beyond the Wall" />
  </div>
);
