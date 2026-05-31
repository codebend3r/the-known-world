import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HouseInfobox } from '@/components/HouseInfobox';
import type { House, Castle, Character, Weapon, Dragon } from '@/lib/schemas';

const targaryen: House = {
  slug: 'targaryen',
  name: 'House Targaryen',
  seat: 'dragonstone',
  liege: null,
  words: 'Fire and Blood',
  sigil: { description: 'A red three-headed dragon on black' },
  founded: { year: -114, era: 'BC', precision: 'year' },
  status: 'exiled',
  'sworn-from': [],
  'cadet-houses': [],
  mentions: [],
  sources: [],
  draft: false,
};

const dragonstone: Castle = {
  slug: 'dragonstone',
  name: 'Dragonstone',
  type: 'castle',
  coords: { x: 0, y: 0 },
  'sworn-houses': [],
  features: [],
  sources: [],
  draft: false,
};

const blackfyre: Weapon = {
  slug: 'blackfyre',
  name: 'Blackfyre',
  type: 'sword',
  material: 'valyrian-steel',
  status: 'lost',
  'origin-house': 'targaryen',
  'current-house': null,
  wielders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const balerion: Dragon = {
  slug: 'balerion',
  name: 'Balerion',
  hatched: null,
  died: null,
  status: 'dead',
  house: 'targaryen',
  riders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const castlesBySlug = new Map<string, Castle>([['dragonstone', dragonstone]]);
const charactersBySlug = new Map<string, Character>();
const housesBySlug = new Map<string, House>([['targaryen', targaryen]]);

describe('HouseInfobox', () => {
  it('links each ancestral weapon to /weapons/<slug>/ when present in the map', () => {
    const targaryenWithWeapon: House = {
      ...targaryen,
      'ancestral-weapons': ['blackfyre'],
    };
    render(
      <HouseInfobox
        house={targaryenWithWeapon}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map([['blackfyre', blackfyre]])}
        dragonsForHouse={[]}
      />,
    );
    const link = screen.getByRole('link', { name: /^blackfyre$/i });
    expect(link.getAttribute('href')).toBe('/weapons/blackfyre/');
  });

  it('falls back to a humanized slug when the weapon is not yet seeded', () => {
    const targaryenWithWeapon: House = {
      ...targaryen,
      'ancestral-weapons': ['dark-sister'],
    };
    render(
      <HouseInfobox
        house={targaryenWithWeapon}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText('Dark Sister')).toBeDefined();
    expect(screen.queryByRole('link', { name: /dark sister/i })).toBeNull();
  });

  it('renders a Dragons row listing every dragon whose `house` matches', () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[balerion]}
      />,
    );
    expect(screen.getByText('Dragons')).toBeDefined();
    const link = screen.getByRole('link', { name: /balerion/i });
    expect(link.getAttribute('href')).toBe('/dragons/balerion/');
  });

  it('renders the Seats row for the default single-seat case', () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText('Seats')).toBeDefined();
    const link = screen.getByRole('link', { name: /dragonstone/i });
    expect(link.getAttribute('href')).toBe('/castles/dragonstone/');
  });

  it('renders "None; sovereign" for a house with no liege', () => {
    render(
      <HouseInfobox
        house={targaryen}
        castlesBySlug={castlesBySlug}
        charactersBySlug={charactersBySlug}
        housesBySlug={housesBySlug}
        weaponsBySlug={new Map()}
        dragonsForHouse={[]}
      />,
    );
    expect(screen.getByText(/none; sovereign/i)).toBeDefined();
  });
});
