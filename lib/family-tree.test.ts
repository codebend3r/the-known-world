import { describe, it, expect } from 'vitest';
import { buildFamilyTree, type TreeNode } from './family-tree';
import { CharacterSchema } from './schemas';

type CharacterInput = Parameters<typeof CharacterSchema.parse>[0];

function character(data: CharacterInput) {
  const fm = CharacterSchema.parse(data);
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
      character({
        slug: 'jon-stark', name: 'Jon Stark', born: null, died: null,
        'primary-house': 'stark', parents: [], spouses: [], children: [],
      }),
    ];
    expect(buildFamilyTree('targaryen', people)).toEqual([]);
  });

  it('treats a person as a root when their parents are not in the house', () => {
    const people = [
      character({
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
      character({
        slug: 'tytos', name: 'Tytos', born: { year: 220, era: 'AC', precision: 'year' }, died: null,
        'primary-house': 'lannister', parents: [], spouses: [], children: ['tywin'],
      }),
      character({
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
      character({
        slug: 'jaehaerys', name: 'Jaehaerys', born: { ...baseDate, year: 225 }, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['shaera'], children: ['aerys'],
      }),
      character({
        slug: 'shaera', name: 'Shaera', born: { ...baseDate, year: 226 }, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['jaehaerys'], children: ['aerys'],
      }),
      character({
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
      character({
        slug: 'tytos', name: 'Tytos', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['jeyne'], children: ['tywin'],
      }),
      character({
        slug: 'jeyne', name: 'Jeyne Marbrand', born: null, died: null,
        'primary-house': 'marbrand', 'also-of-houses': ['lannister'],
        parents: [], spouses: ['tytos'], children: ['tywin'],
      }),
      character({
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
      character({
        slug: 'cersei', name: 'Cersei', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['robert'], children: ['joffrey'],
      }),
      character({
        slug: 'robert', name: 'Robert Baratheon', born: null, died: null,
        'primary-house': 'baratheon', parents: [], spouses: ['cersei'], children: ['joffrey'],
      }),
      character({
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

  it('propagates sex from Character onto the TreeNode and TreeSpouse', () => {
    const people = [
      character({
        slug: 'tytos', name: 'Tytos', sex: 'm', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['jeyne'], children: ['tywin', 'genna'],
      }),
      character({
        slug: 'jeyne', name: 'Jeyne Marbrand', sex: 'f', born: null, died: null,
        'primary-house': 'marbrand', parents: [], spouses: ['tytos'], children: ['tywin', 'genna'],
      }),
      character({
        slug: 'tywin', name: 'Tywin', sex: 'm', born: null, died: null,
        'primary-house': 'lannister', parents: ['tytos', 'jeyne'], spouses: [], children: [],
      }),
      character({
        slug: 'genna', name: 'Genna', sex: 'f', born: null, died: null,
        'primary-house': 'lannister', parents: ['tytos', 'jeyne'], spouses: [], children: [],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    expect(tree[0].sex).toBe('m');
    expect(tree[0].spouses[0].sex).toBe('f');
    expect(tree[0].children.find((c) => c.slug === 'tywin')?.sex).toBe('m');
    expect(tree[0].children.find((c) => c.slug === 'genna')?.sex).toBe('f');
  });

  it('propagates the first alias onto the TreeNode and external children', () => {
    const people = [
      character({
        slug: 'aegon-i', name: 'Aegon I Targaryen', born: null, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['rhaenys'],
        children: ['aenys'], aliases: ['The Conqueror', 'The Dragon'],
      }),
      character({
        slug: 'rhaenys', name: 'Rhaenys Targaryen', born: null, died: null,
        'primary-house': 'targaryen', parents: [], spouses: ['aegon-i'],
        children: ['aenys'], aliases: [],
      }),
      character({
        slug: 'aenys', name: 'Aenys I Targaryen', born: null, died: null,
        'primary-house': 'targaryen', parents: ['aegon-i', 'rhaenys'], spouses: [], children: [],
        aliases: ['King Aenys'],
      }),
    ];
    const tree = buildFamilyTree('targaryen', people);
    expect(tree[0].alias).toBe('The Conqueror');
    expect(tree[0].spouses[0].alias).toBeNull();
    expect(tree[0].children[0].alias).toBe('King Aenys');
  });

  it('propagates aliases onto an external (out-of-house) leaf', () => {
    const people = [
      character({
        slug: 'cersei', name: 'Cersei', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['robert'], children: ['joffrey'],
      }),
      character({
        slug: 'robert', name: 'Robert Baratheon', born: null, died: null,
        'primary-house': 'baratheon', parents: [], spouses: ['cersei'], children: ['joffrey'],
      }),
      character({
        slug: 'joffrey', name: 'Joffrey', born: null, died: null,
        'primary-house': 'baratheon', parents: ['robert', 'cersei'], spouses: [], children: [],
        aliases: ['The Illborn King'],
      }),
    ];
    const tree = buildFamilyTree('lannister', people);
    const joffrey = tree[0].children[0];
    expect(joffrey.external).toBe(true);
    expect(joffrey.alias).toBe('The Illborn King');
  });

  it('keeps sex as null for unknown spouses', () => {
    const people = [
      character({
        slug: 'lord-x', name: 'Lord X', sex: 'm', born: null, died: null,
        'primary-house': 'stark', parents: [], spouses: ['mystery-bride'], children: [],
      }),
    ];
    const tree = buildFamilyTree('stark', people);
    expect(tree[0].spouses[0].slug).toBe('mystery-bride');
    expect(tree[0].spouses[0].sex).toBeNull();
  });

  it('does not render the same person twice across siblings', () => {
    const people = [
      character({
        slug: 'gerold', name: 'Gerold', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['unknown'], children: ['tytos', 'father-of-joanna'],
      }),
      character({
        slug: 'unknown', name: 'Unknown', born: null, died: null,
        'primary-house': 'lannister', parents: [], spouses: ['gerold'], children: ['tytos', 'father-of-joanna'],
        placeholder: true, 'placeholder-reason': 'unnamed',
      }),
      character({
        slug: 'tytos', name: 'Tytos', born: { ...baseDate, year: 220 }, died: null,
        'primary-house': 'lannister', parents: ['gerold', 'unknown'], spouses: ['jeyne'], children: ['tywin'],
      }),
      character({
        slug: 'jeyne', name: 'Jeyne Marbrand', born: null, died: null,
        'primary-house': 'marbrand', parents: [], spouses: ['tytos'], children: ['tywin'],
      }),
      character({
        slug: 'father-of-joanna', name: 'Unknown', born: null, died: null,
        'primary-house': 'lannister', parents: ['gerold', 'unknown'], spouses: [], children: ['joanna'],
        placeholder: true, 'placeholder-reason': 'unnamed',
      }),
      character({
        slug: 'tywin', name: 'Tywin', born: { ...baseDate, year: 242 }, died: null,
        'primary-house': 'lannister', parents: ['tytos', 'jeyne'], spouses: ['joanna'], children: [],
      }),
      character({
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
