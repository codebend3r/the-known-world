import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilteredWeaponList, type WeaponItem } from '@/components/FilteredWeaponList';

const items: WeaponItem[] = [
  { slug: 'blackfyre',   name: 'Blackfyre',   houseSlug: 'targaryen', region: 'crownlands', regionLabel: 'The Crownlands' },
  { slug: 'heartsbane',  name: 'Heartsbane',  houseSlug: 'tarly',     region: 'reach',      regionLabel: 'The Reach' },
  { slug: 'ice',         name: 'Ice',         houseSlug: 'stark',     region: 'north',      regionLabel: 'The North' },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FilteredWeaponList', () => {
  it('renders every weapon by default', () => {
    render(<FilteredWeaponList items={items} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('exposes a labelled search input', () => {
    render(<FilteredWeaponList items={items} />);
    expect(screen.getByRole('searchbox', { name: /search weapons/i })).toBeDefined();
  });

  it('filters after the 300ms debounce', () => {
    render(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ice' } });
    act(() => { vi.advanceTimersByTime(300); });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Ice');
  });

  it('renders the empty state when nothing matches', () => {
    render(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByText(/no weapons match/i)).toBeDefined();
  });

  it('applies the region-tinted class to each card', () => {
    const { container } = render(<FilteredWeaponList items={items} />);
    expect(container.querySelector('.cardNorth')).not.toBeNull();
    expect(container.querySelector('.cardReach')).not.toBeNull();
    expect(container.querySelector('.cardCrownlands')).not.toBeNull();
  });
});
