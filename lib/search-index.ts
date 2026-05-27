import type { House, Person } from './schemas';

export type SearchEntry =
  | { kind: 'house'; slug: string; name: string }
  | {
      kind: 'person';
      slug: string;
      name: string;
      primaryHouseSlug: string;
    };

type Loaded<T> = { frontmatter: T };

export function buildSearchIndex(
  houses: Array<Loaded<House>>,
  people: Array<Loaded<Person>>,
): SearchEntry[] {
  const houseEntries: SearchEntry[] = houses
    .filter((h) => !h.frontmatter.draft)
    .map((h) => ({
      kind: 'house',
      slug: h.frontmatter.slug,
      name: h.frontmatter.name,
    }));

  const personEntries: SearchEntry[] = people
    .filter((p) => !p.frontmatter.draft && !p.frontmatter.placeholder)
    .map((p) => ({
      kind: 'person',
      slug: p.frontmatter.slug,
      name: p.frontmatter.name,
      primaryHouseSlug: p.frontmatter['primary-house'],
    }));

  return [...houseEntries, ...personEntries];
}

function rank(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(` ${q}`)) return 2;
  if (n.includes(q)) return 3;
  return Infinity;
}

export function searchEntries(
  query: string,
  index: SearchEntry[],
  limit = 8,
): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = index
    .map((entry) => ({ entry, r: rank(entry.name, q) }))
    .filter((m) => m.r !== Infinity)
    .sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      if (a.entry.name.length !== b.entry.name.length) {
        return a.entry.name.length - b.entry.name.length;
      }
      return a.entry.name.localeCompare(b.entry.name);
    });
  return matches.slice(0, limit).map((m) => m.entry);
}

export function hrefFor(entry: SearchEntry): string {
  if (entry.kind === 'house') return `/houses/${entry.slug}/`;
  return `/houses/${entry.primaryHouseSlug}/`;
}
