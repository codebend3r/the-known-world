import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredCharacterList, type CharacterItem } from './FilteredCharacterList';

const items: CharacterItem[] = [
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
});
