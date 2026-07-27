import { SiteFooter } from "game-of-thrones-atlas";

// SiteFooter takes no props: a full-width credit line (author name, a GitHub
// link with an inline SVG mark, and the package version read from package.json).
export const Default = () => (
  <div style={{ width: "48rem", maxWidth: "100%" }}>
    <SiteFooter />
  </div>
);
