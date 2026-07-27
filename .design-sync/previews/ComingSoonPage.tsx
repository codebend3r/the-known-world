import { ComingSoonPage } from "game-of-thrones-atlas";

// A placeholder page for sections not yet written: a caption link back to the
// atlas, the section title, a "coming soon" subtitle, and a return link. The
// next/link anchors render as plain <a> in this environment.
export const Default = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <ComingSoonPage title="The Free Cities" />
  </div>
);

export const Battles = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <ComingSoonPage title="Battles of the War of the Five Kings" />
  </div>
);
