import { describe, it, expect } from 'vitest';
import { buildFamilyTree, type TreeNode } from './family-tree';
import { PersonSchema } from './schemas';

type PersonInput = Parameters<typeof PersonSchema.parse>[0];

function person(data: PersonInput) {
  const fm = PersonSchema.parse(data);
  return { frontmatter: fm, body: '', slug: fm.slug };
}

const baseDate = { year: 0, era: 'AC', precision: 'year' as const };

function findNode(roots: TreeNode[], slug: string): TreeNode | null {
  for (const r of roots) {
    if (r.slug === slug) return r;
    const found = findNode(r.children, slug);
    if (found) return found;
  }
  return null;
}

describe('buildFamilyTree', () => {
  it('returns no roots when no person belongs to the house', () => {
    const people = [
      person({
        slug: 'jon-stark', name: 'Jon Stark', born: null, died: null,
        'primary-house': 'stark', parents: [], spouses: [], children: [],
      }),
    ];
    expect(buildFamilyTree('targaryen', people)).toEqual([]);
  });

  it('treats a person as a root when their parents are not in the house', () => {
    const people = [
      person({
        slug: 'gerold', name: 'Gerold', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: [], children: [],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree).toHaveLength(1);
    expect(tree[0].slug).toBe('gerold');
  });

  it('nests children under their in-house parent', () => {
    const people = [
      person({
        slug: 'tytos', name: 'Tytos', born: { year: 220, era: 'AC', precision: 'year' }, died: null,
        'primary-house': 'lannister', parents: [], spouses: [], children: ['tywin'],
      }),
      person({
        slug: 'tywin', name: 'Tywin', born: { year: 242, era: 'AC', precision: 'year' }, died: null,
        'primary-house': 'lannister', parents: ['tytos'], spouses: [], children: [],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree).toHaveLength(1);
    expect(tree[0].slug).toBe('tytos');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].slug).toBe('tywin');
  });

  it('renders an in-house spouse inline and does not duplicate them as a root', () => {
    const people = [
      person({
        slug: 'jaehaerys', name: 'Jaehaerys', born: { ...baseDate, year: 225 }, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['shaera'], children: ['aerys'],
      }),
      person({
        slug: 'shaera', name: 'Shaera', born: { ...baseDate, year: 226 }, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['jaehaerys'], children: ['aerys'],
      }),
      person({
        slug: 'aerys', name: 'Aerys', born: { ...baseDate, year: 244 }, died: null,
        'primary-house': 'targaryen', parents: ['jaehaerys', 'shaera'], spouses: [], children: [],
      }),
    ];
    const tree = buildFamilyTree('targaryen', people);
    expect(tree).toHaveLength(1);
    expect(tree[0].slug).toBe('jaehaerys');
    expect(tree[0].spouses.map((s) => s.slug)).toEqual(['shaera']);
    expect(tree[0].spouses[0].inHouse).toBe(true);
    expect(tree[0].children.map((c) => c.slug)).toEqual(['aerys']);
  });

  it('renders an out-of-house spouse inline without consuming them as a root', () => {
    const people = [
      person({
        slug: 'tytos', name: 'Tytos', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['jeyne'], children: ['tywin'],
      }),
      person({
        slug: 'jeyne', name: 'Jeyne Marbrand', born: null, died: null,
        'primary-house': 'marbrand', 'also-of-houses': ['lannister'],
        parents: [], spouses: ['tytos'], children: ['tywin'],
      }),
      person({
        slug: 'tywin', name: 'Tywin', born: null, died: null,
        'primary-house': 'lannister', parents: ['tytos', 'jeyne'], spouses: [], children: [],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree).toHaveLength(1);
    expect(tree[0].slug).toBe('tytos');
    expect(tree[0].spouses[0]).toMatchObject({ slug: 'jeyne', inHouse: false });
    expect(tree[0].children.map((c) => c.slug)).toEqual(['tywin']);
  });

  it('renders out-of-house children as external leaves with no recursion', () => {
    const people = [
      person({
        slug: 'cersei', name: 'Cersei', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['robert'], children: ['joffrey'],
      }),
      person({
        slug: 'robert', name: 'Robert Baratheon', born: null, died: null,
        'primary-house': 'baratheon', parents: [], spouses: ['cersei'], children: ['joffrey'],
      }),
      person({
        slug: 'joffrey', name: 'Joffrey', born: null, died: null,
        'primary-house': 'baratheon', parents: ['robert', 'cersei'], spouses: [], children: ['phantom'],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree).toHaveLength(1);
    const joffrey = tree[0].children[0];
    expect(joffrey.slug).toBe('joffrey');
    expect(joffrey.external).toBe(true);
    expect(joffrey.children).toEqual([]);
  });

  it('does not render the same person twice across siblings', () => {
    const people = [
      person({
        slug: 'gerold', name: 'Gerold', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['unknown'], children: ['tytos', 'father-of-joanna'],
      }),
      person({
        slug: 'unknown', name: 'Unknown', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['gerold'], children: ['tytos', 'father-of-joanna'],
        placeholder: true, 'placeholder-reason': 'unnamed',
      }),
      person({
        slug: 'tytos', name: 'Tytos', born: { ...baseDate, year: 220 }, died: null,
        'primary-house': 'lannister', parents: ['gerold', 'unknown'], spouses: ['jeyne'], children: ['tywin'],
      }),
      person({
        slug: 'jeyne', name: 'Jeyne Marbrand', born: null, died: null,
        'primary-house': 'marbrand', parents: [], spouses: ['tytos'], children: ['tywin'],
      }),
      person({
        slug: 'father-of-joanna', name: 'Unknown', born: null, died: null,
        'primary-house': 'lannister', parents: ['gerold', 'unknown'], spouses: [], children: ['joanna'],
        placeholder: true, 'placeholder-reason': 'unnamed',
      }),
      person({
        slug: 'tywin', name: 'Tywin', born: { ...baseDate, year: 242 }, died: null,
        'primary-house': 'lannister', parents: ['tytos', 'jeyne'], spouses: ['joanna'], children: [],
      }),
      person({
        slug: 'joanna', name: 'Joanna', born: { ...baseDate, year: 245 }, died: null,
        'primary-house': 'lannister', parents: ['father-of-joanna'], spouses: ['tywin'], children: [],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree).toHaveLength(1);
    expect(tree[0].slug).toBe('gerold');
    const tywin = findNode(tree, 'tywin');
    expect(tywin).not.toBeNull();
    expect(tywin?.spouses.map((s) => s.slug)).toEqual(['joanna']);
    const joannaUnderFather = findNode([tree[0].children[1]], 'joanna');
    expect(joannaUnderFather).toBeNull();
  });
});
