import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchEntries, hrefFor, type SearchEntry } from './search-index';
import type { House, Person } from './schemas';

function mkHouse(over: Partial<House>): { frontmatter: House } {
  return {
    frontmatter: {
      slug: 'x',
      name: 'House X',
      seat: 'somewhere',
      liege: null,
      words: '',
      sigil: { description: '' },
      founded: { year: 0, era: 'AC', precision: 'year' },
      status: 'extant',
      'sworn-from': [],
      'cadet-houses': [],
      sources: [],
      draft: false,
      ...over,
    },
  };
}

function mkPerson(over: Partial<Person>): { frontmatter: Person } {
  return {
    frontmatter: {
      slug: 'p',
      name: 'Person',
      born: null,
      died: null,
      'primary-house': 'x',
      'also-of-houses': [],
      parents: [],
      spouses: [],
      children: [],
      titles: [],
      placeholder: false,
      'placeholder-reason': null,
      sources: [],
      draft: false,
      ...over,
    },
  };
}

describe('buildSearchIndex', () => {
  it('drops draft houses, draft people, and placeholder people', () => {
    const index = buildSearchIndex(
      [
        mkHouse({ slug: 'a', name: 'House A' }),
        mkHouse({ slug: 'b', name: 'House B', draft: true }),
      ],
      [
        mkPerson({ slug: 'p', name: 'Real Person', 'primary-house': 'a' }),
        mkPerson({ slug: 'q', name: 'Draft', draft: true }),
        mkPerson({ slug: 'r', name: 'Unnamed', placeholder: true }),
      ],
    );
    const slugs = index.map((e) => e.slug).sort();
    expect(slugs).toEqual(['a', 'p']);
  });

  it('tags entries with their kind and threads primary-house onto people', () => {
    const index = buildSearchIndex(
      [mkHouse({ slug: 'stark', name: 'House Stark' })],
      [mkPerson({ slug: 'arya-stark', name: 'Arya Stark', 'primary-house': 'stark' })],
    );
    expect(index[0]).toEqual({ kind: 'house', slug: 'stark', name: 'House Stark' });
    expect(index[1]).toEqual({
      kind: 'person',
      slug: 'arya-stark',
      name: 'Arya Stark',
      primaryHouseSlug: 'stark',
    });
  });
});

describe('searchEntries', () => {
  const index: SearchEntry[] = [
    { kind: 'house', slug: 'stark', name: 'House Stark' },
    { kind: 'person', slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
    { kind: 'person', slug: 'eddard-stark', name: 'Eddard Stark', primaryHouseSlug: 'stark' },
    { kind: 'person', slug: 'tywin-lannister', name: 'Tywin Lannister', primaryHouseSlug: 'lannister' },
  ];

  it('returns nothing for an empty or whitespace-only query', () => {
    expect(searchEntries('', index)).toEqual([]);
    expect(searchEntries('   ', index)).toEqual([]);
  });

  it('does case-insensitive substring matching on name', () => {
    const names = searchEntries('STARK', index).map((e) => e.name);
    expect(names).toContain('House Stark');
    expect(names).toContain('Arya Stark');
    expect(names).toContain('Eddard Stark');
    expect(names).not.toContain('Tywin Lannister');
  });

  it('ranks prefix matches above mid-name substring matches', () => {
    const results = searchEntries('a', [
      { kind: 'person', slug: 'babar', name: 'Babar Khan', primaryHouseSlug: 'x' },
      { kind: 'person', slug: 'arya-stark', name: 'Arya Stark', primaryHouseSlug: 'stark' },
    ]);
    expect(results[0].name).toBe('Arya Stark');
  });

  it('honours the limit', () => {
    expect(searchEntries('a', index, 2).length).toBe(2);
  });
});

describe('hrefFor', () => {
  it('houses link to their detail page', () => {
    expect(hrefFor({ kind: 'house', slug: 'stark', name: 'House Stark' })).toBe(
      '/houses/stark/',
    );
  });
  it('people route to their primary house (no person detail page exists)', () => {
    expect(
      hrefFor({
        kind: 'person',
        slug: 'arya-stark',
        name: 'Arya Stark',
        primaryHouseSlug: 'stark',
      }),
    ).toBe('/houses/stark/');
  });
});
