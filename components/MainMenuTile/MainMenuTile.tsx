import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/MainMenuTile/MainMenuTile.module.scss";

export type MainMenuTileProps = {
  title: string;
  subtitle: string;
  glyph: ReactNode;
  href: string;
  plate?: string;
  visible?: boolean;
};

// The collection card: a gold outline glyph and a mono plate number on one row,
// then the display title, the Spectral blurb, and a mono gold entry line.
export function MainMenuTile({
  title,
  subtitle,
  glyph,
  href,
  plate,
  visible = true,
}: MainMenuTileProps) {
  if (!visible) return null;

  return (
    <Link href={href} className={styles.tile}>
      <span className={styles.head}>
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
        {!!plate && (
          <span className={styles.plate} aria-hidden="true">
            {plate}
          </span>
        )}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
      <span className={styles.enter} aria-hidden="true">
        {title} →
      </span>
    </Link>
  );
}
