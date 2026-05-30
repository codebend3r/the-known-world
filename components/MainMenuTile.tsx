import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from '@/components/MainMenuTile.module.css';

export type MainMenuTileProps = {
  title: string;
  subtitle: string;
  glyph: ReactNode;
  href: string;
  status?: 'coming-soon';
};

export function MainMenuTile({
  title,
  subtitle,
  glyph,
  href,
  status,
}: MainMenuTileProps) {
  return (
    <Link href={href} className={styles.tile}>
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
      {status === 'coming-soon' && (
        <span className={styles.pill} aria-hidden="true">
          ⊙ Coming soon
        </span>
      )}
    </Link>
  );
}
