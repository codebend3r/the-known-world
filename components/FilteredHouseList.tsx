'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sigil } from './Sigil';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { filterByName } from '@/lib/search';

export type HouseItem = {
  slug: string;
  name: string;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: HouseItem[];
};

const VIEW_STORAGE_KEY = 'gota:houses-view';

function isViewMode(value: unknown): value is ViewMode {
  return value === 'grid' || value === 'list';
}

export function FilteredHouseList({ items }: Props) {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    // Hydrating client-only state from `localStorage` is exactly the case
    // an after-mount effect exists for: the server can't read it, and a
    // lazy `useState` initializer would diverge from the server snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isViewMode(stored)) setView(stored);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const filtered = filterByName(items, debounced);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  };

  const listClass =
    view === 'list' ? 'house-list house-list--list' : 'house-list';

  return (
    <>
      <div className="list-search-row">
        <input
          type="search"
          className="list-search"
          placeholder="Search houses…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search houses"
          autoComplete="off"
          spellCheck={false}
        />
        <ViewToggle value={view} onChange={handleViewChange} />
      </div>
      {filtered.length === 0 ? (
        <p className="list-search__empty">No houses match &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <ul className={listClass}>
          {filtered.map((item) => {
            const cardClass = item.region
              ? `house-list__card house-list__card--region-${item.region}`
              : 'house-list__card';
            return (
              <li key={item.slug} className="house-list__item">
                <Link href={`/houses/${item.slug}/`} className={cardClass}>
                  <Sigil
                    slug={item.slug}
                    name={item.name}
                    size={view === 'list' ? '2rem' : '6rem'}
                    decorative
                  />
                  <span className="house-list__name">{item.name}</span>
                  {view === 'list' && item.regionLabel && (
                    <span className="house-list__region">{item.regionLabel}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
