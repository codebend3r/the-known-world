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

const BOOK = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M5 6 H15 V26 H5 Z M17 6 H27 V26 H17 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M16 6 V26" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

export function MainMenu() {
  return (
    <nav className="main-menu" aria-label="Atlas sections">
      <MainMenuTile
        title="Map"
        subtitle="Survey the realm."
        glyph={COMPASS}
        href="/map/"
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
        title="Encyclopedia"
        subtitle="Consult the scribes."
        glyph={BOOK}
        href="/encyclopedia/"
        status="coming-soon"
      />
    </nav>
  );
}
