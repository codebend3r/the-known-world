import { FiligreeFlourish } from "game-of-thrones-atlas";

// A decorative vine flourish drawn in molten gold. Sizes to its container's
// font-size / width; shown here at a couple of scales and mirrored.
export const Default = () => (
  <div style={{ fontSize: "2rem", color: "var(--tkw-gold)" }}>
    <FiligreeFlourish />
  </div>
);

export const Mirrored = () => (
  <div style={{ fontSize: "2rem" }}>
    <FiligreeFlourish mirrored />
  </div>
);

export const PairedAsHeaderRule = () => (
  <div
    style={{
      display: "grid",
      justifyItems: "center",
      gap: "0.25rem",
      fontSize: "1.5rem",
    }}
  >
    <FiligreeFlourish />
    <FiligreeFlourish mirrored />
  </div>
);
