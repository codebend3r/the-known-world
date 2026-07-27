import { MainMenu } from "game-of-thrones-atlas";

// MainMenu takes no props: it renders the full atlas-section navigation grid
// of MainMenuTile links (Maps, Timeline, Houses, Castles, Characters,
// Weapons, Battles). The Dragons tile is authored with visible={false} in the
// source, so it does not appear. Each tile is a next/link (renders <a>).
export const Default = () => (
  <div style={{ width: "60rem", maxWidth: "100%" }}>
    <MainMenu />
  </div>
);
