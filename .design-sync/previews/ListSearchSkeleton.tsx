import { ListSearchSkeleton } from "game-of-thrones-atlas";

// The disabled loading placeholder for a list-page search input, shown while
// the entry index streams in. `withControls` widens the row to leave room for
// a sort control alongside the field.
export const Default = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <ListSearchSkeleton placeholder="Search the great houses…" />
  </div>
);

export const WithControls = () => (
  <div style={{ width: "34rem", maxWidth: "100%" }}>
    <ListSearchSkeleton
      placeholder="Search castles and holdfasts…"
      withControls
    />
  </div>
);
