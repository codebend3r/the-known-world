'use client';

import { useEffect, useState } from 'react';
import { Sigil } from './Sigil';
import { filterByName } from '@/lib/search';

export type PersonItem = {
  slug: string;
  name: string;
  primaryHouseSlug: string;
};

type Props = {
  items: PersonItem[];
};

export function FilteredPeopleList({ items }: Props) {
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
        placeholder="Search people…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search people"
        autoComplete="off"
        spellCheck={false}
      />
      {filtered.length === 0 ? (
        <p className="list-search__empty">No people match &ldquo;{debounced}&rdquo;.</p>
      ) : (
        <ul className="people-list">
          {filtered.map((item) => (
            <li key={item.slug} className="people-list__item">
              <div className="people-list__card">
                <Sigil
                  slug={item.primaryHouseSlug}
                  name={item.name}
                  size="3.25rem"
                  decorative
                />
                <span className="people-list__name">{item.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
