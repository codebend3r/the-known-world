import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeaponInfobox } from '@/components/WeaponInfobox';
import type { Weapon, House, Character } from '@/lib/schemas';

const blackfyre: Weapon = {
  slug: 'blackfyre',
  name: 'Blackfyre',
  type: 'sword',
  material: 'valyrian-steel',
  status: 'lost',
  'origin-house': 'targaryen',
  'current-house': null,
  wielders: ['aegon-i-targaryen', 'daemon-i-blackfyre'],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const targaryen: House = {
  slug: 'targaryen',
  name: 'House Targaryen',
  seat: 'dragonstone',
  liege: null,
  words: 'Fire and Blood',
  sigil: { description: '' },
  founded: { year: -114, era: 'BC', precision: 'year' },
  status: 'exiled',
  'sworn-from': [], 'cadet-houses': [], mentions: [],
  sources: [], draft: false,
};

const aegon: Character = {
  slug: 'aegon-i-targaryen',
  name: 'Aegon I Targaryen',
  sex: 'm',
  born: { year: -27, era: 'BC', precision: 'year' },
  died: { year: 37, era: 'AC', precision: 'year' },
  'primary-house': 'targaryen',
  'also-of-houses': [], parents: [], spouses: [], children: [],
  titles: [], aliases: [], mentions: [],
  placeholder: false, 'placeholder-reason': null,
  sources: [], draft: false,
};

const housesBySlug = new Map<string, House>([['targaryen', targaryen]]);
const charactersBySlug = new Map<string, Character>([['aegon-i-targaryen', aegon]]);

describe('WeaponInfobox', () => {
  it('renders type, material, and status rows', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText('Type')).toBeDefined();
    expect(screen.getByText('Material')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('links the origin house to its detail page', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole('link', { name: /house targaryen/i });
    expect(link.getAttribute('href')).toBe('/houses/targaryen/');
  });

  it('renders linkable wielders that exist in the characters map', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole('link', { name: /aegon i targaryen/i });
    expect(link.getAttribute('href')).toBe('/characters/aegon-i-targaryen/');
  });

  it('renders unknown wielders as plain text', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.queryByRole('link', { name: /daemon i blackfyre/i })).toBeNull();
    expect(screen.getByText('Daemon I Blackfyre')).toBeDefined();
  });

  it('shows "Lost" for the current-house row when null and status is lost', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    // Status row says "Lost" and Current house row says "Lost" — two matches.
    expect(screen.getAllByText('Lost')).toHaveLength(2);
  });
});
