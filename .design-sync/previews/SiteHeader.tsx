import { SiteHeader } from "the-known-world";

// SiteHeader takes no props: a full-width banner whose only content is the
// "The Known World" wordmark linking home (next/link renders <a>).
export const Default = () => (
  <div style={{ width: "48rem", maxWidth: "100%" }}>
    <SiteHeader />
  </div>
);
