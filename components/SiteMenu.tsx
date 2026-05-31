'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/lib/cx';
import styles from '@/components/SiteMenu.module.css';

const ITEMS = [
  { href: '/maps/', label: 'Maps' },
  { href: '/timeline/', label: 'Timeline' },
  { href: '/houses/', label: 'Houses' },
  { href: '/characters/', label: 'Characters' },
  { href: '/weapons/', label: 'Weapons' },
  { href: '/dragons/', label: 'Dragons' },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalised = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return normalised === href || normalised.startsWith(href);
}

export function SiteMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
      wasOpen.current = false;
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        className={cx(styles.backdrop, isOpen && styles.backdropOpen)}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        id={panelId}
        className={cx(styles.panel, isOpen && styles.panelOpen)}
        aria-hidden={!isOpen}
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Menu</span>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close menu"
            onClick={close}
            tabIndex={isOpen ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M5 5l14 14M19 5L5 19"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={cx(styles.link, active && styles.linkActive)}
                    aria-current={active ? 'page' : undefined}
                    onClick={close}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
