import Link from 'next/link';
import type { ReactNode } from 'react';

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
    <Link href={href} className="main-menu-tile">
      <span className="main-menu-tile__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="main-menu-tile__title">{title}</span>
      <span className="main-menu-tile__subtitle">{subtitle}</span>
      {status === 'coming-soon' && (
        <span className="main-menu-tile__pill">⊙ Coming soon</span>
      )}
    </Link>
  );
}
