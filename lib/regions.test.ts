import { describe, it, expect } from 'vitest';
import { regionForHouse, regionLabel } from '@/lib/regions';
import { HouseSchema, type House } from '@/lib/schemas';

const founded = { year: 0, era: 'AC', precision: 'year' };

function house(data: Record<string, unknown> & { slug: string; name: string; seat: string; liege: string | null }): House {
  return HouseSchema.parse({
    words: '',
    sigil: { description: '' },
    founded,
    status: 'extant',
    'sworn-from': [],
    'cadet-houses': [],
    sources: [],
    ...data,
  });
}

function mapOf(houses: House[]): Map<string, House> {
  return new Map(houses.map((h) => [h.slug, h]));
}

describe('regionForHouse', () => {
  it('maps a great house directly to its region', () => {
    const houses = mapOf([
      house({ slug: 'stark', name: 'House Stark', seat: 'winterfell', liege: null }),
    ]);
    expect(regionForHouse('stark', houses)).toBe('north');
  });

  it('walks a single-hop liege chain to the great house', () => {
    const houses = mapOf([
      house({ slug: 'stark', name: 'House Stark', seat: 'winterfell', liege: null }),
      house({ slug: 'karstark', name: 'House Karstark', seat: 'karhold', liege: 'stark' }),
    ]);
    expect(regionForHouse('karstark', houses)).toBe('north');
  });

  it('walks a multi-hop liege chain', () => {
    const houses = mapOf([
      house({ slug: 'tyrell', name: 'House Tyrell', seat: 'highgarden', liege: null }),
      house({ slug: 'hightower', name: 'House Hightower', seat: 'oldtown', liege: 'tyrell' }),
      house({ slug: 'cadet', name: 'House Cadet', seat: 'somewhere', liege: 'hightower' }),
    ]);
    expect(regionForHouse('cadet', houses)).toBe('reach');
  });

  it('prefers an explicit `region` field over walking the liege chain', () => {
    const houses = mapOf([
      house({ slug: 'allyrion', name: 'House Allyrion', seat: 'godsgrace', liege: null, region: 'dorne' }),
    ]);
    expect(regionForHouse('allyrion', houses)).toBe('dorne');
  });

  it('returns null when the chain leads to an unknown house', () => {
    const houses = mapOf([
      house({ slug: 'orphan', name: 'House Orphan', seat: 'nowhere', liege: 'ghost' }),
    ]);
    expect(regionForHouse('orphan', houses)).toBeNull();
  });

  it('returns null on a cycle that never reaches a great house', () => {
    const houses = mapOf([
      house({ slug: 'a', name: 'House A', seat: 'x', liege: 'b' }),
      house({ slug: 'b', name: 'House B', seat: 'y', liege: 'a' }),
    ]);
    expect(regionForHouse('a', houses)).toBeNull();
  });

  it('returns null for a slug that is not in the index', () => {
    expect(regionForHouse('ghost', mapOf([]))).toBeNull();
  });
});

describe('regionLabel', () => {
  it('returns the display name for a known region slug', () => {
    expect(regionLabel('north')).toBe('The North');
    expect(regionLabel('iron-islands')).toBe('The Iron Islands');
    expect(regionLabel('dorne')).toBe('Dorne');
  });

  it('returns null when the slug is null', () => {
    expect(regionLabel(null)).toBeNull();
  });
});
