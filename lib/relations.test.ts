import { describe, it, expect } from 'vitest';
import { buildRelationGraph, findOrphanSlugs } from './relations';
import { CastleSchema, HouseSchema } from './schemas';

function castle(data: Parameters<typeof CastleSchema.parse>[0]) {
  return { frontmatter: CastleSchema.parse(data), body: '', slug: (data as { slug: string }).slug };
}

function house(data: Parameters<typeof HouseSchema.parse>[0]) {
  return { frontmatter: HouseSchema.parse(data), body: '', slug: (data as { slug: string }).slug };
}

const starkFounded = { year: 0, era: 'AC', precision: 'year' };
const winterfellCoords = { x: 0, y: 0 };

describe('buildRelationGraph', () => {
  it('builds a graph from castles and houses', () => {
    const castles = [
      castle({ slug: 'winterfell', name: 'Winterfell', type: 'castle', 'liege-house': 'stark', 'sworn-houses': ['karstark'], coords: winterfellCoords, sources: [] }),
    ];
    const houses = [
      house({ slug: 'stark', name: 'House Stark', seat: 'winterfell', liege: null, words: '', sigil: { description: '' }, founded: starkFounded, status: 'extant', 'sworn-from': ['karstark'], 'cadet-houses': [], sources: [] }),
    ];
    const graph = buildRelationGraph({ castles, houses, characters: [], events: [] });
    expect(graph.castleByHouse.get('stark')).toEqual(['winterfell']);
    expect(graph.houseBySeat.get('winterfell')).toBe('stark');
  });
});

describe('findOrphanSlugs', () => {
  it('returns slugs referenced but not defined', () => {
    const castles = [
      castle({ slug: 'winterfell', name: 'Winterfell', type: 'castle', 'liege-house': 'stark', 'sworn-houses': ['ghostvale'], coords: winterfellCoords, sources: [] }),
    ];
    const houses = [
      house({ slug: 'stark', name: 'House Stark', seat: 'winterfell', liege: null, words: '', sigil: { description: '' }, founded: starkFounded, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [] }),
    ];
    const orphans = findOrphanSlugs({ castles, houses, characters: [], events: [] });
    expect(orphans).toContain('ghostvale');
  });

  it('returns empty when all references resolve', () => {
    const houses = [
      house({ slug: 'stark', name: 'House Stark', seat: 'winterfell', liege: null, words: '', sigil: { description: '' }, founded: starkFounded, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [] }),
    ];
    const castles = [
      castle({ slug: 'winterfell', name: 'Winterfell', type: 'castle', 'liege-house': 'stark', 'sworn-houses': [], coords: winterfellCoords, sources: [] }),
    ];
    const orphans = findOrphanSlugs({ castles, houses, characters: [], events: [] });
    expect(orphans).toHaveLength(0);
  });
});
