import { describe, it, expect } from 'vitest';
import { buildRelationGraph, findOrphanSlugs } from './relations';

describe('buildRelationGraph', () => {
  it('builds a graph from castles and houses', () => {
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': ['karstark'], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': ['karstark'], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const graph = buildRelationGraph({ castles, houses: houses as never, people: [], events: [] });
    expect(graph.castleByHouse.get('stark')).toEqual(['winterfell']);
    expect(graph.houseBySeat.get('winterfell')).toBe('stark');
  });
});

describe('findOrphanSlugs', () => {
  it('returns slugs referenced but not defined', () => {
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': ['ghostvale'], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const orphans = findOrphanSlugs({ castles, houses: houses as never, people: [], events: [] });
    expect(orphans).toContain('ghostvale');
  });

  it('returns empty when all references resolve', () => {
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': [], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const orphans = findOrphanSlugs({ castles, houses: houses as never, people: [], events: [] });
    expect(orphans).toHaveLength(0);
  });
});
