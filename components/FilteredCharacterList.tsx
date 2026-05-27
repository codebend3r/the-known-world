'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sigil } from './Sigil';
import { filterByName } from '@/lib/search';

export type CharacterItem = {
  slug: string;
  name: string;
  primaryHouseSlug: string;
};

type Props = {
  items: CharacterItem[];
};

export function FilteredCharacterList({ items }: Props) {
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
        <ul className="character-list">
          {filtered.map((item) => (
            <li key={item.slug} className="character-list__item">
              <Link
                href={`/characters/${item.slug}/`}
                className="character-list__card"
              >
                <Sigil
                  slug={item.primaryHouseSlug}
                  name={item.name}
                  size="3.25rem"
                  decorative
                />
                <span className="character-list__name">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
