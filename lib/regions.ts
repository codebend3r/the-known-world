import type { House } from './schemas';

export const REGIONS = {
  stark: { slug: 'north', name: 'The North' },
  arryn: { slug: 'vale', name: 'The Vale' },
  tully: { slug: 'riverlands', name: 'The Riverlands' },
  lannister: { slug: 'westerlands', name: 'The Westerlands' },
  tyrell: { slug: 'reach', name: 'The Reach' },
  baratheon: { slug: 'stormlands', name: 'The Stormlands' },
  martell: { slug: 'dorne', name: 'Dorne' },
  greyjoy: { slug: 'iron-islands', name: 'The Iron Islands' },
  targaryen: { slug: 'crownlands', name: 'The Crownlands' },
} as const;

export type RegionSlug = (typeof REGIONS)[keyof typeof REGIONS]['slug'];

export function regionForHouse(
  slug: string,
  housesBySlug: Map<string, House>,
): RegionSlug | null {
  const seen = new Set<string>();
  let current: string | null = slug;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current in REGIONS) {
      return REGIONS[current as keyof typeof REGIONS].slug;
    }
    const house = housesBySlug.get(current);
    if (!house) return null;
    current = house.liege;
  }
  return null;
}
