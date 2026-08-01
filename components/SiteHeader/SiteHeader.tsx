"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { isActive, visibleNavItems } from "@/lib/nav";
import styles from "@/components/SiteHeader/SiteHeader.module.scss";

const ITEMS = visibleNavItems();

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true">
            ✦
          </span>
          <span className={styles.title}>The Known World</span>
        </Link>
        <nav className={styles.nav} aria-label="Sections">
          {ITEMS.map((item) => {
            const active = isActive({ pathname, href: item.href });
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.link, active && styles.linkActive)}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
