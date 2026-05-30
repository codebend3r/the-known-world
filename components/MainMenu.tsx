import { MainMenuTile } from './MainMenuTile';

const COMPASS = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M16 5 L19 17 L16 27 L13 17 Z" fill="currentColor" />
    <path d="M5 16 L16 13 L27 16 L16 19 Z" fill="currentColor" opacity="0.5" />
  </svg>
);

const HOURGLASS = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M8 4 H24 V8 L18 16 L24 24 V28 H8 V24 L14 16 L8 8 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M11 7 H21 L16 14 Z" fill="currentColor" />
  </svg>
);

const SIGIL = (
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

export function MainMenu() {
  return (
    <nav className="main-menu" aria-label="Atlas sections">
      <MainMenuTile
        title="Maps"
        subtitle="Survey the realm."
        glyph={COMPASS}
        href="/maps/"
        status="coming-soon"
      />
      <MainMenuTile
        title="Timeline"
        subtitle="Trace the centuries."
        glyph={HOURGLASS}
        href="/timeline/"
        status="coming-soon"
      />
      <MainMenuTile
        title="Houses"
        subtitle="Read the rolls of the great houses."
        glyph={SIGIL}
        href="/houses/"
      />
    </nav>
  );
}
