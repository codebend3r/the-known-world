import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HeaderSearch } from './HeaderSearch';
import type { SearchEntry } from '@/lib/search-index';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const entries: SearchEntry[] = [
  { kind: 'house', slug: 'stark', name: 'House Stark' },
  { kind: 'person', slug: 'eddard-stark', name: 'Eddard Stark', primaryHouseSlug: 'stark' },
  { kind: 'person', slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
  { kind: 'person', slug: 'tywin-lannister', name: 'Tywin Lannister', primaryHouseSlug: 'lannister' },
];

beforeEach(() => {
  push.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HeaderSearch', () => {
  it('renders a labelled combobox input', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox', { name: /search people and houses/i });
    expect(input).toBeDefined();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not show results until the 300ms debounce elapses', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows matching results once the debounce elapses', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const options = screen.getAllByRole('option');
    const names = options.map((o) => o.textContent ?? '');
    expect(names.some((n) => n.includes('House Stark'))).toBe(true);
    expect(names.some((n) => n.includes('Eddard Stark'))).toBe(true);
    expect(names.some((n) => n.includes('Tywin Lannister'))).toBe(false);
  });

  it('marks the first result selected and Enter routes to it', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'arya' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/houses/stark/');
  });

  it('arrow keys move the active option', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
  });

  it('Escape closes the dropdown', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'stark' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('listbox')).not.toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('person entries route to their primary house', () => {
    render(<HeaderSearch entries={entries} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'tywin' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/houses/lannister/');
  });
});
