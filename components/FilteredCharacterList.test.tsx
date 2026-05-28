import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredCharacterList, type CharacterItem } from './FilteredCharacterList';

const items: CharacterItem[] = [
  { slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark', region: 'north' },
  { slug: 'eddard-stark', name: 'Eddard Stark', primaryHouseSlug: 'stark', region: 'north' },
  { slug: 'tywin-lannister', name: 'Tywin Lannister', primaryHouseSlug: 'lannister', region: 'westerlands' },
];

function manyItems(n: number): CharacterItem[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `c-${String(i).padStart(3, '0')}`,
    name: `Char ${String(i).padStart(3, '0')}`,
    primaryHouseSlug: 'stark',
    region: 'north',
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

  it('applies a region-tinted modifier class per card', () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelector('.character-list__card--region-north')).not.toBeNull();
    expect(
      container.querySelector('.character-list__card--region-westerlands'),
    ).not.toBeNull();
  });

  it('falls back to the base card class when no region is known', () => {
    const noRegion: CharacterItem[] = [
      { slug: 'x', name: 'X', primaryHouseSlug: 'unknown', region: null },
    ];
    const { container } = render(<FilteredCharacterList items={noRegion} />);
    expect(container.querySelector('.character-list__card')).not.toBeNull();
    expect(
      container.querySelector('[class*="character-list__card--region"]'),
    ).toBeNull();
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

  it('hides pagination when the filtered list is at or below the smallest page size', () => {
    render(<FilteredCharacterList items={items} pageSize={30} />);
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
  });

  it('keeps the pagination nav visible above 10 items even when one page suffices', () => {
    render(<FilteredCharacterList items={manyItems(25)} pageSize={30} />);
    const navs = screen.getAllByRole('navigation', { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 1/);
    const prevButtons = screen.getAllByRole('button', { name: /previous page/i }) as HTMLButtonElement[];
    const nextButtons = screen.getAllByRole('button', { name: /next page/i }) as HTMLButtonElement[];
    expect(prevButtons.every((b) => b.disabled)).toBe(true);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(screen.getAllByRole('combobox', { name: /characters per page/i }).length).toBe(2);
  });

  it('shows the first page of items and a pagination nav when there is overflow', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    expect(container.querySelectorAll('.character-list__item').length).toBe(30);
    const navs = screen.getAllByRole('navigation', { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 3/);
    const prevButtons = screen.getAllByRole('button', { name: /previous page/i }) as HTMLButtonElement[];
    expect(prevButtons.every((b) => b.disabled)).toBe(true);
  });

  it('renders a pagination nav above and below the list', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const children = Array.from(container.children);
    const list = children.find((el) => el.classList.contains('character-list'));
    const navs = children.filter((el) => el.classList.contains('pagination'));
    expect(navs.length).toBe(2);
    expect(children.indexOf(navs[0])).toBeLessThan(children.indexOf(list as Element));
    expect(children.indexOf(navs[1])).toBeGreaterThan(children.indexOf(list as Element));
    expect(navs[0].classList.contains('pagination--top')).toBe(true);
    expect(navs[1].classList.contains('pagination--bottom')).toBe(true);
  });

  it('advances to the next page when Next is clicked from the top nav', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topNext] = screen.getAllByRole('button', { name: /next page/i });
    fireEvent.click(topNext);
    const firstCardName = container.querySelector('.character-list__name')?.textContent;
    expect(firstCardName).toBe('Char 030');
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
  });

  it('disables Next on the last page', () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const nextButtons = screen.getAllByRole('button', { name: /next page/i }) as HTMLButtonElement[];
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[0]);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
  });

  it('renders the page-size selector with all five options and 30 selected by default', () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topSelect] = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    const optionLabels = Array.from(topSelect.options).map((o) => o.textContent);
    expect(optionLabels).toEqual(['10', '30', '60', '100', 'All']);
    expect(topSelect.value).toBe('30');
  });

  it('switches to page size 10 and recomputes the page count', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topSelect] = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: '10' } });
    expect(container.querySelectorAll('.character-list__item').length).toBe(10);
    expect(screen.getAllByText(/Page 1 of 8/).length).toBe(2);
  });

  it('switches to "All" and renders every item on one page', () => {
    const { container } = render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topSelect] = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: 'Infinity' } });
    expect(container.querySelectorAll('.character-list__item').length).toBe(75);
    expect(screen.getAllByText(/Page 1 of 1/).length).toBe(2);
    const nextButtons = screen.getAllByRole('button', { name: /next page/i }) as HTMLButtonElement[];
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
  });

  it('resets to page 1 when the page size changes', () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topNext] = screen.getAllByRole('button', { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    const [topSelect] = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: '60' } });
    expect(screen.getAllByText(/Page 1 of 2/).length).toBe(2);
  });

  it('keeps the top and bottom selectors in sync', () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const selects = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: '100' } });
    const after = screen.getAllByRole('combobox', { name: /characters per page/i }) as HTMLSelectElement[];
    expect(after[0].value).toBe('100');
    expect(after[1].value).toBe('100');
  });

  it('resets to page 1 when the search filter changes', () => {
    const lots: CharacterItem[] = [
      ...manyItems(60),
      { slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark', region: 'north' },
    ];
    render(<FilteredCharacterList items={lots} pageSize={30} />);
    const [nextBtn] = screen.getAllByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/Page 2/).length).toBe(2);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'arya' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Search shrinks results to 1, so pagination disappears entirely.
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
  });
});
