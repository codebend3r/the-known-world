import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredCharacterList, type CharacterItem } from './FilteredCharacterList';

const items: CharacterItem[] = [
  { slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
  { slug: 'eddard-stark', name: 'Eddard Stark', primaryHouseSlug: 'stark' },
  { slug: 'tywin-lannister', name: 'Tywin Lannister', primaryHouseSlug: 'lannister' },
];

function manyItems(n: number): CharacterItem[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `c-${String(i).padStart(3, '0')}`,
    name: `Char ${String(i).padStart(3, '0')}`,
    primaryHouseSlug: 'stark',
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FilteredCharacterList', () => {
  it('renders every character by default', () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelectorAll('.character-list__item').length).toBe(3);
  });

  it('renders each card as a link to /characters/[slug]/', () => {
    render(<FilteredCharacterList items={items} />);
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/characters/arya-stark/');
    expect(hrefs).toContain('/characters/eddard-stark/');
    expect(hrefs).toContain('/characters/tywin-lannister/');
  });

  it('exposes a labelled search input', () => {
    render(<FilteredCharacterList items={items} />);
    expect(
      screen.getByRole('searchbox', { name: /search characters/i }),
    ).toBeDefined();
  });

  it('does not filter until the 300ms debounce elapses', () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'arya' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.querySelectorAll('.character-list__item').length).toBe(3);
  });

  it('filters the list once the debounce elapses', () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const cards = container.querySelectorAll('.character-list__item');
    expect(cards.length).toBe(2);
    const names = Array.from(cards).map((el) => el.textContent ?? '');
    expect(names.some((n) => n.includes('Arya Stark'))).toBe(true);
    expect(names.some((n) => n.includes('Eddard Stark'))).toBe(true);
  });

  it('renders the empty state when nothing matches', () => {
    render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no characters match/i)).toBeDefined();
  });

  it('hides pagination when the filtered list fits on one page', () => {
    render(<FilteredCharacterList items={items} pageSize={30} />);
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
  });

  it('shows the first page of items and a pagination nav when there is overflow', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    expect(container.querySelectorAll('.character-list__item').length).toBe(30);
    const nav = screen.getByRole('navigation', { name: /pagination/i });
    expect(nav.textContent).toMatch(/Page 1 of 3/);
    const prev = screen.getByRole('button', { name: /previous page/i }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('advances to the next page when Next is clicked', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const next = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(next);
    const firstCardName = container.querySelector('.character-list__name')?.textContent;
    expect(firstCardName).toBe('Char 030');
    expect(screen.getByText(/Page 2 of 3/)).toBeDefined();
  });

  it('disables Next on the last page', () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const next = screen.getByRole('button', { name: /next page/i }) as HTMLButtonElement;
    fireEvent.click(next);
    fireEvent.click(next);
    expect(next.disabled).toBe(true);
    expect(screen.getByText(/Page 3 of 3/)).toBeDefined();
  });

  it('resets to page 1 when the search filter changes', () => {
    const lots: CharacterItem[] = [
      ...manyItems(60),
      { slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
    ];
    render(<FilteredCharacterList items={lots} pageSize={30} />);
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText(/Page 2/)).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'arya' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Search shrinks results to 1, so pagination disappears entirely.
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
  });
});
