import { FiligreeRule } from "game-of-thrones-atlas";

// An ornamental horizontal divider (a lozenge flanked by two rules) used to
// underline page headings in place of a plain border.
export const Default = () => (
  <div style={{ width: "22rem", color: "var(--tkw-gold)" }}>
    <FiligreeRule />
  </div>
);

export const UnderAHeading = () => (
  <hgroup
    style={{
      display: "grid",
      justifyItems: "center",
      gap: "0.5rem",
      width: "24rem",
    }}
  >
    <h1 style={{ margin: 0 }}>The Reach</h1>
    <FiligreeRule />
  </hgroup>
);
