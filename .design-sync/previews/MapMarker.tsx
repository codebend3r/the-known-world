import { MapMarker } from "game-of-thrones-atlas";

// A single map pin: an SVG anchor linking to a castle page, with a type glyph
// (castle, town, ruin, watchtower, or holdfast) and its name label. MapMarker
// renders SVG primitives, so it must live inside an <svg>; cx/cy place it in
// the map's coordinate space.
export const AllTypes = () => (
  <div style={{ width: "30rem", maxWidth: "100%" }}>
    <svg viewBox="0 0 300 200" style={{ width: "100%", background: "#efe2c0" }}>
      <MapMarker
        slug="winterfell"
        name="Winterfell"
        type="castle"
        cx={40}
        cy={30}
      />
      <MapMarker
        slug="wintertown"
        name="Winter Town"
        type="town"
        cx={40}
        cy={70}
      />
      <MapMarker
        slug="harrenhal"
        name="Harrenhal"
        type="ruin"
        cx={40}
        cy={110}
      />
      <MapMarker
        slug="queensgate"
        name="Queensgate"
        type="watchtower"
        cx={40}
        cy={150}
      />
      <MapMarker
        slug="oldstones"
        name="Oldstones"
        type="holdfast"
        cx={40}
        cy={185}
      />
    </svg>
  </div>
);

export const SingleCastle = () => (
  <div style={{ width: "18rem", maxWidth: "100%" }}>
    <svg viewBox="0 0 160 60" style={{ width: "100%", background: "#efe2c0" }}>
      <MapMarker
        slug="casterly-rock"
        name="Casterly Rock"
        type="castle"
        cx={24}
        cy={30}
      />
    </svg>
  </div>
);
