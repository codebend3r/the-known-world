import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredHouseList, type HouseItem } from './FilteredHouseList';

const items: HouseItem[] = [
  { slug: 'stark', name: 'Stark', region: 'north' },
  { slug: 'lannister', name: 'Lannister', region: 'westerlands' },
  { slug: 'tully', name: 'Tully', region: 'riverlands' },
];

beforeEach(() => {
  vi.useFakeTimers();
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
