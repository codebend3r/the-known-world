import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  variant?: 'block';
};

export function ParchmentLayout({ children, variant }: Props) {
  const className = variant
    ? `parchment-page parchment-page--${variant}`
    : 'parchment-page';
  return <main className={className}>{children}</main>;
}
