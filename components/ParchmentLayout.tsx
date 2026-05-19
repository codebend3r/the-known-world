import type { ReactNode } from 'react';

export function ParchmentLayout({ children }: { children: ReactNode }) {
  return <main className="parchment-page">{children}</main>;
}
