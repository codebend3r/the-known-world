import { PlateLayout } from "game-of-thrones-atlas";

// A full-page wrapper that renders its children inside the parchment frame used
// by every index and entry page. Given a heading and a paragraph of prose here.
export const Default = () => (
  <div style={{ width: "46rem", maxWidth: "100%" }}>
    <PlateLayout>
      <h1>The North</h1>
      <p className="subtitle">Winter is Coming</p>
      <p>
        The largest of the Seven Kingdoms, the North stretches from the Neck to
        the Wall, a vast cold land of moors, bogs, and ancient weirwoods. For
        eight thousand years the Kings of Winter ruled from Winterfell, until
        Torrhen Stark bent the knee to Aegon the Conqueror and became Warden of
        the North. Its people keep the old gods, and its lords still remember
        the words carved above the crypts of their forebears.
      </p>
    </PlateLayout>
  </div>
);
