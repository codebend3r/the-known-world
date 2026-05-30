'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sigil } from './Sigil';
import { filterByName } from '@/lib/search';

const SEARCH_PARAM = 'search';

function readSearchParam(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(SEARCH_PARAM) ?? '';
}

function writeSearchParam(value: string) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (value) {
    params.set(SEARCH_PARAM, value);
  } else {
    params.delete(SEARCH_PARAM);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

export type CharacterItem = {
  slug: string;
  name: string;
  alias: string | null;
  primaryHouseSlug: string | null;
  region: string | null;
  portrait: string;
};

type Props = {
  items: CharacterItem[];
  pageSize?: number;
};

const PAGE_SIZE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 10, label: '10' },
  { value: 30, label: '30' },
  { value: 60, label: '60' },
  { value: 100, label: '100' },
  { value: Infinity, label: 'All' },
];

const MIN_PAGE_SIZE = 10;

export function FilteredCharacterList({ items, pageSize = 30 }: Props) {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState('');
  const [size, setSize] = useState(pageSize);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  if (debounced !== lastFilterKey) {
    setLastFilterKey(debounced);
    setPage(1);
  }

  const filtered = filterByName(items, debounced);
  const effectiveSize = Number.isFinite(size) ? size : filtered.length || 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectiveSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * effectiveSize;
  const pageItems = filtered.slice(pageStart, pageStart + effectiveSize);

  const handleSizeChange = (next: number) => {
    setSize(next);
    setPage(1);
  };

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
      <label className="pagination__page-size">
        Show{' '}
        <select
          className="pagination__page-size-select"
          value={String(size)}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
          aria-label="Characters per page"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt.label} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>{' '}
        per page
      </label>
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

  const showPagination = filtered.length > MIN_PAGE_SIZE;

  return (
    <>
      <div className="list-search-wrap">
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
      </div>
      {filtered.length === 0 ? (
        <p className="list-search__empty">No characters match &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <>
          {showPagination && renderPagination('top')}
          <ul className="character-list">
            {pageItems.map((item) => {
              const cardClass = item.region
                ? `character-list__card character-list__card--region-${item.region}`
                : 'character-list__card';
              return (
                <li key={item.slug} className="character-list__item">
                  <Link href={`/characters/${item.slug}/`} className={cardClass}>
                    <span className="character-list__portrait" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.portrait}
                        alt=""
                        width={270}
                        height={180}
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span className="character-list__sigil" aria-hidden="true">
                      <Sigil
                        slug={item.primaryHouseSlug}
                        name={item.name}
                        size="3.25rem"
                        decorative
                      />
                    </span>
                    <span className="character-list__name">{item.name}</span>
                    {item.alias && (
                      <span className="character-list__alias">({item.alias})</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {showPagination && renderPagination('bottom')}
        </>
      )}
    </>
  );
}
