import Link from 'next/link';
import { SiteMenu } from '@/components/SiteMenu';
import styles from '@/components/SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <SiteMenu />
        <Link href="/" className={styles.titleLink}>
          <p className={styles.title}>The Known World</p>
        </Link>
        <span className={styles.spacer} aria-hidden="true" />
      </div>
    </header>
  );
}
