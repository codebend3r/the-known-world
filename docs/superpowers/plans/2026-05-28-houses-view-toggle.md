# Houses grid/list view toggle: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grid/list view toggle to `/houses/`, persisted via `localStorage`, with list rows showing sigil + name + region label.

**Architecture:** A new stateless `ViewToggle` segmented control feeds a `view` state in `FilteredHouseList`. The state hydrates from `localStorage['gota:houses-view']` after mount (SSR-safe). The same `<ul>` markup is reused with a `.house-list--list` modifier that flips the grid into one row per house. Region labels come from a new helper next to the existing `regionForHouse`.

**Tech Stack:** Next.js 16 (static export), React client component, Vitest + Testing Library, plain CSS.

---

## File Structure

| File | Kind | Responsibility |
|---|---|---|
| `lib/regions.ts` | modify | Add `regionLabel(slug)` helper. |
| `lib/regions.test.ts` | modify | Cover the new helper. |
| `components/ViewToggle.tsx` | new | Stateless segmented control (2 buttons). |
| `components/ViewToggle.test.tsx` | new | Unit tests for the toggle. |
| `components/FilteredHouseList.tsx` | modify | View state + hydration effect + new layout. |
| `components/FilteredHouseList.test.tsx` | modify | Tests for toggle + persistence. |
| `app/houses/page.tsx` | modify | Compute and pass `regionLabel` per item. |
| `styles/list-search.css` | modify | `.list-search-row`, `.view-toggle`. |
| `styles/houses.css` | modify | `.house-list--list` and region-tinted left border. |

---

## Task 1: `regionLabel` helper

**Files:**
- Modify: `lib/regions.ts`
- Test: `lib/regions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/regions.test.ts`:

```ts
import { regionForHouse, regionLabel } from './regions';

describe('regionLabel', () => {
  it('returns the display name for a known region slug', () => {
    expect(regionLabel('north')).toBe('The North');
    expect(regionLabel('iron-islands')).toBe('The Iron Islands');
    expect(regionLabel('dorne')).toBe('Dorne');
  });

  it('returns null when the slug is null', () => {
    expect(regionLabel(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL.** `bun run test -- lib/regions.test.ts`

- [ ] **Step 3: Implement helper.** Append to `lib/regions.ts`:

```ts
const REGION_LABELS: Record<RegionSlug, string> = Object.fromEntries(
  Object.values(REGIONS).map((r) => [r.slug, r.name]),
) as Record<RegionSlug, string>;

export function regionLabel(slug: RegionSlug | null): string | null {
  return slug ? REGION_LABELS[slug] : null;
}
```

- [ ] **Step 4: Verify tests pass.**

- [ ] **Step 5: Commit.**

---

## Task 2: `ViewToggle` component

**Files:**
- Create: `components/ViewToggle.tsx`
- Test: `components/ViewToggle.test.tsx`

- [ ] **Step 1: Write the failing test** (`components/ViewToggle.test.tsx`):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ViewToggle } from './ViewToggle';

describe('ViewToggle', () => {
  it('marks the selected button with aria-pressed="true"', () => {
    render(<ViewToggle value="grid" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /grid view/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /list view/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange when the unselected button is clicked', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="grid" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('does not call onChange when the selected button is clicked', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes a labelled group', () => {
    render(<ViewToggle value="grid" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /view/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify FAIL.** `bun run test -- components/ViewToggle.test.tsx`

- [ ] **Step 3: Implement** (`components/ViewToggle.tsx`):

```tsx
'use client';

export type ViewMode = 'grid' | 'list';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewToggle({ value, onChange }: Props) {
  const handleSelect = (next: ViewMode) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className="view-toggle" role="group" aria-label="View">
      <button
        type="button"
        className="view-toggle__button"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        onClick={() => handleSelect('grid')}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className="view-toggle__button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => handleSelect('list')}
      >
        <ListIcon />
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <rect x="1" y="2" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="1" y="12" width="14" height="2" fill="currentColor" />
    </svg>
  );
}
```

- [ ] **Step 4: Verify PASS.**

- [ ] **Step 5: Commit.**

---

## Task 3: Region label in items, list view markup, and toggle wiring

**Files:**
- Modify: `components/FilteredHouseList.tsx`
- Modify: `components/FilteredHouseList.test.tsx`
- Modify: `app/houses/page.tsx`

- [ ] **Step 1: Update existing tests to include `regionLabel`.** In every `HouseItem` fixture in `FilteredHouseList.test.tsx`, add `regionLabel` (`'The North'`, `'The Westerlands'`, `'The Riverlands'`).

- [ ] **Step 2: Add failing tests for the toggle + list view + persistence:**

```tsx
import { ViewToggle } from './ViewToggle'; // not used directly but documents intent

describe('FilteredHouseList view toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts in grid view by default', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    expect(container.querySelector('ul.house-list')).not.toBeNull();
    expect(container.querySelector('ul.house-list--list')).toBeNull();
    expect(screen.getByRole('button', { name: /grid view/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to list view when the list button is clicked', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(container.querySelector('ul.house-list--list')).not.toBeNull();
    expect(window.localStorage.getItem('gota:houses-view')).toBe('list');
  });

  it('hydrates the stored choice from localStorage after mount', async () => {
    window.localStorage.setItem('gota:houses-view', 'list');
    const { container } = render(<FilteredHouseList items={items} />);
    await act(async () => {});
    expect(container.querySelector('ul.house-list--list')).not.toBeNull();
  });

  it('ignores invalid stored values and stays in grid view', async () => {
    window.localStorage.setItem('gota:houses-view', 'kanban');
    const { container } = render(<FilteredHouseList items={items} />);
    await act(async () => {});
    expect(container.querySelector('ul.house-list--list')).toBeNull();
  });

  it('shows the region label on each list row', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(container.querySelector('.house-list__region')?.textContent).toBe('The North');
  });
});
```

- [ ] **Step 3: Verify FAIL.**

- [ ] **Step 4: Update `components/FilteredHouseList.tsx`:**

```tsx
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

  const listClass = view === 'list' ? 'house-list house-list--list' : 'house-list';

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
                    size={view === 'list' ? '2rem' : '4.5rem'}
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
```

- [ ] **Step 5: Update `app/houses/page.tsx`.** Import `regionLabel` and pass it per item:

```tsx
import { loadAllHouses } from '@/lib/content';
import { regionForHouse, regionLabel } from '@/lib/regions';
// ...
const items: HouseItem[] = visible
  .map((h) => {
    const region = regionForHouse(h.frontmatter.slug, housesBySlug);
    return {
      slug: h.frontmatter.slug,
      name: shortName(h.frontmatter.name),
      region,
      regionLabel: regionLabel(region),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
```

- [ ] **Step 6: Verify all `FilteredHouseList` tests PASS.**

- [ ] **Step 7: Commit.**

---

## Task 4: CSS for search row + view toggle

**Files:**
- Modify: `styles/list-search.css`

- [ ] **Step 1: Append to `styles/list-search.css`:**

```css
.list-search-row {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
}

.list-search-row .list-search {
  flex: 1;
}

.view-toggle {
  display: inline-flex;
  gap: 0;
  border: 1px solid rgba(107, 68, 35, 0.35);
  border-radius: 2px;
  overflow: hidden;
  background: rgba(248, 236, 208, 0.55);
}

.view-toggle__button {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faded);
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.view-toggle__button + .view-toggle__button {
  border-left: 1px solid rgba(107, 68, 35, 0.35);
}

.view-toggle__button:hover,
.view-toggle__button:focus-visible {
  color: var(--gold-leaf);
  outline: none;
  background: rgba(248, 236, 208, 0.9);
}

.view-toggle__button[aria-pressed='true'] {
  color: var(--ink);
  background: rgba(212, 162, 89, 0.18);
}

@media (prefers-reduced-motion: reduce) {
  .view-toggle__button {
    transition: none;
  }
}
```

- [ ] **Step 2: Commit.**

---

## Task 5: CSS for list view rows

**Files:**
- Modify: `styles/houses.css`

- [ ] **Step 1: Append to `styles/houses.css`:**

```css
.house-list--list {
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

@media (min-width: 800px) {
  .house-list--list {
    --bleed-max: 1280px;
  }
}

.house-list--list .house-list__card {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto;
  align-items: center;
  gap: 1rem;
  min-height: 0;
  padding: 0.65rem 1rem;
  text-align: left;
  border-left-width: 3px;
}

.house-list--list .house-list__name {
  font-size: 1.1rem;
  letter-spacing: 2px;
}

.house-list__region {
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-variant: small-caps;
  letter-spacing: 1.5px;
  color: var(--ink-faded);
  text-align: right;
}
```

- [ ] **Step 2: Commit.**

---

## Self-Review

- Spec covered: `regionLabel` helper (Task 1), `ViewToggle` (Task 2), state + persistence + markup + label wiring (Task 3), search-row + toggle CSS (Task 4), list-row CSS (Task 5). ✓
- No placeholders / TBDs. ✓
- Type consistency: `HouseItem.regionLabel: string | null`, `ViewMode = 'grid' | 'list'`, `VIEW_STORAGE_KEY = 'gota:houses-view'`, all referenced consistently across tasks. ✓
- Test coverage matches the spec's testing section. ✓
