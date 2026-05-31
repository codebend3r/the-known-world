import { MainMenuTile } from "@/components/MainMenuTile";
import styles from "@/components/MainMenu.module.scss";

const COMPASS = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <circle
      cx="16"
      cy="16"
      r="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
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

const FIGURE = (
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
    <circle cx="16" cy="11" r="1.5" fill="currentColor" opacity="0.6" />
  </svg>
);

const SWORD = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <circle cx="16" cy="5" r="1.7" fill="currentColor" opacity="0.6" />
    <path
      d="M16 7 V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
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
    <path d="M14 14 H18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </svg>
);

const DRAGON = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M6 22 Q4 16 8 12 Q14 14 16 18 Q18 14 24 12 Q28 16 26 22 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M16 18 V26 M14 26 H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
  </svg>
);

export function MainMenu() {
  return (
    <nav className={styles.menu} aria-label="Atlas sections">
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
      <MainMenuTile
        title="Characters"
        subtitle="Meet the lords, knights, and kings."
        glyph={FIGURE}
        href="/characters/"
      />
      <MainMenuTile
        title="Weapons"
        subtitle="Lift the blades of legend."
        glyph={SWORD}
        href="/weapons/"
      />
      <MainMenuTile
        title="Dragons"
        subtitle="Wake the dragon."
        glyph={DRAGON}
        href="/dragons/"
      />
    </nav>
  );
}
