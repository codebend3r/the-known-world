import { SiteHeader } from "game-of-thrones-atlas";

// SiteHeader takes no props: a full-width banner whose only content is the
// "The Known World" wordmark linking home (next/link renders <a>).
export const Default = () => (
  <div style={{ width: "48rem", maxWidth: "100%" }}>
    <SiteHeader />
  </div>
);
