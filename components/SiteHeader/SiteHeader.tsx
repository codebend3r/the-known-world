import Link from "next/link";
import { FiligreeFlourish } from "@/components/Filigree";
import styles from "@/components/SiteHeader/SiteHeader.module.scss";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.titleLink}>
          <FiligreeFlourish className={styles.flourish} />
          <p className={styles.title}>The Known World</p>
          <FiligreeFlourish mirrored className={styles.flourish} />
        </Link>
      </div>
    </header>
  );
}
