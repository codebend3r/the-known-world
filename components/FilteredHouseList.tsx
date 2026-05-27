'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sigil } from './Sigil';
import { filterByName } from '@/lib/search';

export type HouseItem = {
  slug: string;
  name: string;
  region: string | null;
};

type Props = {
  items: HouseItem[];
};

export function FilteredHouseList({ items }: Props) {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const filtered = filterByName(items, debounced);

  return (
    <>
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
      {filtered.length === 0 ? (
        <p className="list-search__empty">No houses match &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <ul className="house-list">
          {filtered.map((item) => {
            const cardClass = item.region
              ? `house-list__card house-list__card--region-${item.region}`
              : 'house-list__card';
            return (
              <li key={item.slug} className="house-list__item">
                <Link href={`/houses/${item.slug}/`} className={cardClass}>
                  <Sigil slug={item.slug} name={item.name} size="4.5rem" decorative />
                  <span className="house-list__name">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
