import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredHouseList, type HouseItem } from './FilteredHouseList';

const items: HouseItem[] = [
  { slug: 'stark', name: 'Stark', region: 'north', regionLabel: 'The North' },
  { slug: 'lannister', name: 'Lannister', region: 'westerlands', regionLabel: 'The Westerlands' },
  { slug: 'tully', name: 'Tully', region: 'riverlands', regionLabel: 'The Riverlands' },
];

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FilteredHouseList', () => {
  it('renders every house card by default', () => {
    render(<FilteredHouseList items={items} />);
    const cards = screen.getAllByRole('link');
    expect(cards.length).toBe(3);
  });

  it('exposes a labelled search input', () => {
    render(<FilteredHouseList items={items} />);
    expect(
      screen.getByRole('searchbox', { name: /search houses/i }),
    ).toBeDefined();
  });

  it('does not filter until the 300ms debounce elapses', () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.getAllByRole('link').length).toBe(3);
  });

  it('filters the list once the debounce elapses', () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const cards = screen.getAllByRole('link');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Stark');
  });

  it('renders the empty state when nothing matches', () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole('link').length).toBe(0);
    expect(screen.getByText(/no houses match/i)).toBeDefined();
  });

  it('applies the region-tinted class to each card', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    expect(
      container.querySelector('.house-list__card--region-north'),
    ).not.toBeNull();
    expect(
      container.querySelector('.house-list__card--region-westerlands'),
    ).not.toBeNull();
  });
});

describe('FilteredHouseList view toggle', () => {
  it('starts in grid view by default', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    expect(container.querySelector('ul.house-list')).not.toBeNull();
    expect(container.querySelector('ul.house-list--list')).toBeNull();
    expect(
      screen.getByRole('button', { name: /grid view/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('switches to list view when the list button is clicked', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    });
    expect(container.querySelector('ul.house-list--list')).not.toBeNull();
    expect(window.localStorage.getItem('gota:houses-view')).toBe('list');
  });

  it('hydrates the stored choice from localStorage after mount', () => {
    window.localStorage.setItem('gota:houses-view', 'list');
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector('ul.house-list--list')).not.toBeNull();
  });

  it('ignores invalid stored values and stays in grid view', () => {
    window.localStorage.setItem('gota:houses-view', 'kanban');
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector('ul.house-list--list')).toBeNull();
  });

  it('shows the region label on each list row', () => {
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    });
    const regions = container.querySelectorAll('.house-list__region');
    expect(regions.length).toBe(3);
    expect(Array.from(regions).map((r) => r.textContent)).toEqual(
      expect.arrayContaining(['The North', 'The Westerlands', 'The Riverlands']),
    );
  });
});
