import type { ReactNode } from 'react';
import styles from './ParchmentLayout.module.css';

type Props = {
  children: ReactNode;
};

export function ParchmentLayout({ children }: Props) {
  return <main className={styles.page}>{children}</main>;
}
