import type { ReactNode } from 'react';
import styles from './DropCap.module.css';

export function DropCap({ children }: { children: ReactNode }) {
  return <p className={styles.dropCap}>{children}</p>;
}
