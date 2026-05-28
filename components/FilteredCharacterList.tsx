'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sigil } from './Sigil';
import { filterByName } from '@/lib/search';

export type CharacterItem = {
  slug: string;
  name: string;
  primaryHouseSlug: string;
  region: string | null;
};

type Props = {
  items: CharacterItem[];
  pageSize?: number;
};

export function FilteredCharacterList({ items, pageSize = 30 }: Props) {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  if (debounced !== lastFilterKey) {
    setLastFilterKey(debounced);
    setPage(1);
  }

  const filtered = filterByName(items, debounced);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const renderPagination = (position: 'top' | 'bottom') => (
    <nav
      className={`pagination pagination--${position}`}
      aria-label={`Character list pagination, ${position}`}
    >
      <button
        type="button"
        className="pagination__button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ← Prev
      </button>
      <span
        className="pagination__status"
        {...(position === 'bottom' ? { 'aria-live': 'polite' as const } : {})}
      >
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        className="pagination__button"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );

  return (
    <>
      <input
        type="search"
        className="list-search"
        placeholder="Search characters…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search characters"
        autoComplete="off"
        spellCheck={false}
      />
      {filtered.length === 0 ? (
        <p className="list-search__empty">No characters match &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <>
          {totalPages > 1 && renderPagination('top')}
          <ul className="character-list">
            {pageItems.map((item) => {
              const cardClass = item.region
                ? `character-list__card character-list__card--region-${item.region}`
                : 'character-list__card';
              return (
                <li key={item.slug} className="character-list__item">
                  <Link href={`/characters/${item.slug}/`} className={cardClass}>
                    <Sigil
                      slug={item.primaryHouseSlug}
                      name={item.name}
                      size="3.25rem"
                      decorative
                    />
                    <span className="character-list__name">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && renderPagination('bottom')}
        </>
      )}
    </>
  );
}
