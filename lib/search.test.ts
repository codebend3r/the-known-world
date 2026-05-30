import { describe, it, expect } from 'vitest';
import { filterByName } from '@/lib/search';

const items = [
  { name: 'House Stark' },
  { name: 'Arya Stark' },
  { name: 'Eddard Stark' },
  { name: 'Tywin Lannister' },
];

describe('filterByName', () => {
  it('returns a copy of the list when the query is empty', () => {
    const result = filterByName(items, '');
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it('returns a copy of the list when the query is whitespace', () => {
    expect(filterByName(items, '   ')).toEqual(items);
  });

  it('preserves input order when the query is empty', () => {
    expect(filterByName(items, '').map((i) => i.name)).toEqual([
      'House Stark',
      'Arya Stark',
      'Eddard Stark',
      'Tywin Lannister',
    ]);
  });

  it('does case-insensitive substring matching on name', () => {
    const names = filterByName(items, 'STARK').map((i) => i.name);
    expect(names).toContain('House Stark');
    expect(names).toContain('Arya Stark');
    expect(names).toContain('Eddard Stark');
    expect(names).not.toContain('Tywin Lannister');
  });

  it('ranks prefix matches above mid-name substring matches', () => {
    const result = filterByName(
      [{ name: 'Babar Khan' }, { name: 'Arya Stark' }],
      'a',
    );
    expect(result[0].name).toBe('Arya Stark');
  });

  it('ranks word-start matches above mid-word substring matches', () => {
    const result = filterByName(
      [{ name: 'Caster Black' }, { name: 'Mance Rayder' }],
      'r',
    );
    expect(result[0].name).toBe('Mance Rayder');
  });

  it('preserves the original order for items at the same rank', () => {
    const result = filterByName(items, 'stark');
    expect(result.map((i) => i.name)).toEqual([
      'House Stark',
      'Arya Stark',
      'Eddard Stark',
    ]);
  });
});
