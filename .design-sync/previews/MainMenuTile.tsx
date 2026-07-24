import { MainMenuTile } from "game-of-thrones-atlas";

// MainMenuTile is a single atlas-section link: a line-art glyph over a title
// and subtitle, wrapped in a next/link (renders <a>). `glyph` is any ReactNode;
// these cells pass self-contained 32x32 currentColor SVGs, matching the shared
// SectionGlyphs marks. `visible={false}` renders nothing (see Hidden cell).

const sigilGlyph = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M16 3 L27 8 V17 C27 22 22 26 16 29 C10 26 5 22 5 17 V8 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M16 11 L18 15 L22 15 L19 18 L20 22 L16 20 L12 22 L13 18 L10 15 L14 15 Z"
      fill="currentColor"
      opacity="0.7"
    />
  </svg>
);

const figureGlyph = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <circle
      cx="16"
      cy="11"
      r="5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M6 28 Q6 19 16 19 Q26 19 26 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const keepGlyph = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M5 27 L5 11 L7 11 L7 9 L10 9 L10 11 L13 11 L13 9 L16 9 L16 11 L19 11 L19 9 L22 9 L22 11 L25 11 L25 9 L27 9 L27 11 L27 27 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M13 27 L13 19 Q16 16 19 19 L19 27"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const swordGlyph = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M9 10 H23"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13 11 L16 28 L19 11 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const Houses = () => (
  <div style={{ maxWidth: "20rem" }}>
    <MainMenuTile
      title="Houses"
      subtitle="Read the rolls of the great houses."
      glyph={sigilGlyph}
      href="/houses/"
    />
  </div>
);

export const Characters = () => (
  <div style={{ maxWidth: "20rem" }}>
    <MainMenuTile
      title="Characters"
      subtitle="Meet the lords, knights, and kings."
      glyph={figureGlyph}
      href="/characters/"
    />
  </div>
);

export const Castles = () => (
  <div style={{ maxWidth: "20rem" }}>
    <MainMenuTile
      title="Castles"
      subtitle="Tour the seats and strongholds."
      glyph={keepGlyph}
      href="/castles/"
    />
  </div>
);

export const Hidden = () => (
  <div style={{ maxWidth: "20rem" }}>
    <MainMenuTile
      title="Weapons"
      subtitle="Hidden until visible is true — renders nothing."
      glyph={swordGlyph}
      href="/weapons/"
      visible={false}
    />
  </div>
);
