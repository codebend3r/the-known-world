import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ParchmentLayout({ children }: Props) {
  return <main className="parchment-page">{children}</main>;
}
