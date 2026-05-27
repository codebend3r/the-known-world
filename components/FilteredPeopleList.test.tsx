import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredPeopleList, type PersonItem } from './FilteredPeopleList';

const items: PersonItem[] = [
  { slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
  { slug: 'eddard-stark', name: 'Eddard Stark', primaryHouseSlug: 'stark' },
  { slug: 'tywin-lannister', name: 'Tywin Lannister', primaryHouseSlug: 'lannister' },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FilteredPeopleList', () => {
  it('renders every person by default', () => {
    const { container } = render(<FilteredPeopleList items={items} />);
    expect(container.querySelectorAll('.people-list__item').length).toBe(3);
  });

  it('exposes a labelled search input', () => {
    render(<FilteredPeopleList items={items} />);
    expect(
      screen.getByRole('searchbox', { name: /search people/i }),
    ).toBeDefined();
  });

  it('does not filter until the 300ms debounce elapses', () => {
    const { container } = render(<FilteredPeopleList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'arya' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.querySelectorAll('.people-list__item').length).toBe(3);
  });

  it('filters the list once the debounce elapses', () => {
    const { container } = render(<FilteredPeopleList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const cards = container.querySelectorAll('.people-list__item');
    expect(cards.length).toBe(2);
    const names = Array.from(cards).map((el) => el.textContent ?? '');
    expect(names.some((n) => n.includes('Arya Stark'))).toBe(true);
    expect(names.some((n) => n.includes('Eddard Stark'))).toBe(true);
  });

  it('renders the empty state when nothing matches', () => {
    render(<FilteredPeopleList items={items} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no people match/i)).toBeDefined();
  });
});
