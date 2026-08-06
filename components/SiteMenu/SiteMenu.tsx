"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { isActive, visibleNavItems } from "@/lib/nav";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import styles from "@/components/SiteMenu/SiteMenu.module.scss";

// A glyph supersedes an icon at render time, so an entry that supplies one
// needs no raster art. Keeping `icon` required invites dead paths to files
// that were never added.
type MenuArt = {
  icon?: string;
  glyph?: ReactNode;
};

// Drawer-only decoration, keyed by route. The nav list itself lives in
// `lib/nav` so the header rail and this drawer stay in step.
const ART: Record<string, MenuArt> = {
  "/maps/": { icon: "/menu-icons/map.png" },
  "/timeline/": { icon: "/menu-icons/timeline.png" },
  "/houses/": { icon: "/menu-icons/houses.png" },
  "/castles/": { glyph: sectionGlyphs.castles },
  "/characters/": { icon: "/menu-icons/characters.png" },
  "/weapons/": { icon: "/menu-icons/weapons.png" },
  "/battles/": {
    icon: "/menu-icons/battles.png",
    glyph: sectionGlyphs.battles,
  },
  "/dragons/": { icon: "/menu-icons/dragons.png" },
};

const ITEMS = visibleNavItems();

export function SiteMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
        ref={panelRef}
        id={panelId}
        className={cx(styles.panel, isOpen && styles.panelOpen)}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
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
              const active = isActive({ pathname, href: item.href });
              const art = ART[item.href];
              return (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={cx(styles.link, active && styles.linkActive)}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span className={styles.linkIcon} aria-hidden="true">
                      {art?.glyph ?? (
                        <Image
                          src={art?.icon ?? "/menu-icons/map.png"}
                          alt=""
                          width={48}
                          height={48}
                          sizes="48px"
                        />
                      )}
                    </span>
                    <span className={styles.linkLabel}>{item.label}</span>
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
