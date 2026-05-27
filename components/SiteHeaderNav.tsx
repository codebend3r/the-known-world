'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/maps/', label: 'Maps' },
  { href: '/timeline/', label: 'Timeline' },
  { href: '/houses/', label: 'Houses' },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalised = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return normalised === href || normalised.startsWith(href);
}

export function SiteHeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="site-header__nav" aria-label="Primary">
      <ul className="site-header__nav-list">
        {ITEMS.map((item, i) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="site-header__nav-item">
              <Link
                href={item.href}
                className={
                  active
                    ? 'site-header__link site-header__link--active'
                    : 'site-header__link'
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
              {i < ITEMS.length - 1 && (
                <span className="site-header__separator" aria-hidden="true">
                  ✦
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
