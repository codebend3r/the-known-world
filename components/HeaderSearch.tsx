'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchEntries, hrefFor, type SearchEntry } from '@/lib/search-index';

type Props = { entries: SearchEntry[] };

export function HeaderSearch({ entries }: Props) {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [lastResetKey, setLastResetKey] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const results = useMemo(
    () => searchEntries(debouncedValue, entries),
    [debouncedValue, entries],
  );

  if (debouncedValue !== lastResetKey) {
    setLastResetKey(debouncedValue);
    setActive(0);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const isOpen = open && results.length > 0;

  function close() {
    setOpen(false);
    setValue('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      router.push(hrefFor(results[active]));
      close();
    }
  }

  return (
    <div className="header-search" ref={containerRef}>
      <input
        type="search"
        role="combobox"
        className="header-search__input"
        placeholder="Search people and houses…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-label="Search people and houses"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={isOpen ? `${listboxId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {isOpen && (
        <ul id={listboxId} role="listbox" className="header-search__results">
          {results.map((entry, i) => {
            const optionClass =
              i === active
                ? 'header-search__option header-search__option--active'
                : 'header-search__option';
            return (
              <li
                key={`${entry.kind}-${entry.slug}`}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={optionClass}
              >
                <Link
                  href={hrefFor(entry)}
                  className="header-search__link"
                  onMouseEnter={() => setActive(i)}
                  onClick={close}
                >
                  <span className="header-search__name">{entry.name}</span>
                  <span className="header-search__kind">
                    {entry.kind === 'house' ? 'House' : 'Person'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
