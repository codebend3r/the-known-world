import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/MainMenuTile/MainMenuTile.module.scss";

export type MainMenuTileProps = {
  plate: string;
  title: string;
  subtitle: string;
  glyph: ReactNode;
  href: string;
  visible?: boolean;
};

// One entry in the homepage contents ledger: the plate numeral, the section
// glyph on its riveted plaque, the title pair, and the engraved pointer.
export function MainMenuTile({
  plate,
  title,
  subtitle,
  glyph,
  href,
  visible = true,
}: MainMenuTileProps) {
  if (!visible) return null;

  return (
    <Link href={href} className={styles.tile}>
      <span className={styles.plate}>
        <span className={styles.plateLabel}>Plate</span>
        <span className={styles.plateNumeral}>{plate}</span>
      </span>
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
      </span>
      <span className={styles.pointer} aria-hidden="true">
        <svg viewBox="0 0 32 12" width="32" height="12">
          <path
            d="M3 6 H26 M21.5 2.5 L27 6 L21.5 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="3" cy="6" r="1.3" fill="currentColor" />
        </svg>
      </span>
    </Link>
  );
}
