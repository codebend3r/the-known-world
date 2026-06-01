import Link from "next/link";
import { SiteMenu } from "@/components/SiteMenu";
import styles from "@/components/SiteHeader.module.scss";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <SiteMenu />
        <Link href="/" className={styles.titleLink}>
          <p className={styles.title}>The Known World</p>
        </Link>
      </div>
    </header>
  );
}
