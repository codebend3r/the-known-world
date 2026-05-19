import type { ReactNode } from 'react';

export function DropCap({ children }: { children: ReactNode }) {
  return <p className="drop-cap">{children}</p>;
}
