import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/MainMenuTile/MainMenuTile.module.scss";

export type MainMenuTileProps = {
  title: string;
  subtitle: string;
  glyph: ReactNode;
  href: string;
  visible?: boolean;
};

export function MainMenuTile({
  title,
  subtitle,
  glyph,
  href,
  visible = true,
}: MainMenuTileProps) {
  if (!visible) return null;

  return (
    <Link href={href} className={styles.tile}>
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
    </Link>
  );
}
