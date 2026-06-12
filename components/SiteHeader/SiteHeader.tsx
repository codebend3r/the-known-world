import Link from "next/link";
import styles from "@/components/SiteHeader/SiteHeader.module.scss";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.titleLink}>
          <p className={styles.title}>The Known World</p>
        </Link>
      </div>
    </header>
  );
}
