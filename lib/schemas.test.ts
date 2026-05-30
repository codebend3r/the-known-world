import { describe, it, expect } from 'vitest';
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
} from '@/lib/schemas';

describe('CastleSchema', () => {
  it('parses a complete valid castle', () => {
    const input = {
      slug: 'winterfell',
      name: 'Winterfell',
      type: 'castle',
      'sub-region': 'northern-mountains',
      'liege-house': 'stark',
      founded: { year: -8000, era: 'age-of-heroes', precision: 'legendary' },
      'sworn-houses': ['karstark', 'umber'],
      features: ['godswood'],
      coords: { x: 412, y: 280 },
      sources: [{ type: 'awoiaf', url: 'https://example', license: 'CC-BY-SA-4.0' }],
      draft: false,
    };
    expect(() => CastleSchema.parse(input)).not.toThrow();
  });

  it('rejects an invalid type', () => {
    const input = { slug: 'x', name: 'X', type: 'spaceport', coords: { x: 0, y: 0 }, sources: [], draft: false };
    expect(() => CastleSchema.parse(input)).toThrow();
  });

  it('defaults draft to false when omitted', () => {
    const input = {
      slug: 'x', name: 'X', type: 'castle',
      coords: { x: 0, y: 0 }, sources: [],
    };
    const parsed = CastleSchema.parse(input);
    expect(parsed.draft).toBe(false);
  });
});

describe('HouseSchema', () => {
  it('parses a Great House (null liege)', () => {
    const input = {
      slug: 'stark',
      name: 'House Stark',
      seat: 'winterfell',
      liege: null,
      words: 'Winter is Coming',
      sigil: { description: 'A grey direwolf on a white field' },
      founded: { year: -8000, era: 'age-of-heroes', precision: 'legendary' },
      status: 'extant',
      'sworn-from': ['karstark'],
      'cadet-houses': ['greystark'],
      sources: [],
      draft: false,
    };
    expect(() => HouseSchema.parse(input)).not.toThrow();
  });

  it('parses an infobox-rich house with seats, heads, regions, titles, weapons, and an extinct date', () => {
    const input = {
      slug: 'targaryen',
      name: 'House Targaryen',
      seat: 'dragonstone',
      liege: null,
      words: 'Fire and Blood',
      sigil: { description: 'A red three-headed dragon on black' },
      founded: { year: -114, era: 'BC', precision: 'year' },
      extinct: { year: 283, era: 'AC', precision: 'year' },
      status: 'exiled',
      'sworn-from': [],
      'cadet-houses': ['blackfyre'],
      seats: [
        { name: 'Dragonstone', slug: 'dragonstone', note: 'formerly' },
        { name: 'Great Pyramid', slug: 'great-pyramid' },
      ],
      heads: [{ name: 'Queen Daenerys I', slug: 'daenerys-targaryen' }],
      regions: [{ name: "Slaver's Bay" }],
      titles: [{ name: 'Dragonlord', note: 'pre-Doom' }],
      'ancestral-weapons': [{ name: 'Blackfyre' }, { name: 'Dark Sister' }],
      sources: [],
    };
    expect(() => HouseSchema.parse(input)).not.toThrow();
  });

  it('rejects unknown status', () => {
    const input = {
      slug: 'x', name: 'X', seat: 'y', liege: null,
      words: '', sigil: { description: '' },
      founded: { year: 0, era: 'AC', precision: 'year' },
      status: 'partying', 'sworn-from': [], 'cadet-houses': [], sources: [],
    };
    expect(() => HouseSchema.parse(input)).toThrow();
  });
});

describe('CharacterSchema', () => {
  it('parses a named character', () => {
    const input = {
      slug: 'eddard-stark',
      name: 'Eddard Stark',
      sex: 'm',
      born: { year: 263, era: 'AC', precision: 'year' },
      died: { year: 299, era: 'AC', precision: 'year' },
      'primary-house': 'stark',
      'also-of-houses': [],
      parents: ['rickard-stark', 'lyarra-stark'],
      spouses: ['catelyn-tully'],
      children: ['robb-stark'],
      titles: ['Lord of Winterfell'],
      placeholder: false,
      'placeholder-reason': null,
      sources: [],
      draft: false,
    };
    expect(() => CharacterSchema.parse(input)).not.toThrow();
  });

  it('allows a placeholder character with null name dates', () => {
    const input = {
      slug: 'unnamed-stark-daughter',
      name: 'Unnamed Stark daughter',
      sex: 'f',
      born: null,
      died: null,
      'primary-house': 'stark',
      'also-of-houses': [],
      parents: ['cregan-stark'],
      spouses: [],
      children: [],
      titles: [],
      placeholder: true,
      'placeholder-reason': 'unnamed',
      sources: [],
      draft: false,
    };
    expect(() => CharacterSchema.parse(input)).not.toThrow();
  });

  it('defaults sex to null when omitted', () => {
    const input = {
      slug: 'x', name: 'X',
      born: null, died: null,
      'primary-house': 'stark',
      'also-of-houses': [], parents: [], spouses: [], children: [], titles: [],
      sources: [], draft: false,
    };
    const parsed = CharacterSchema.parse(input);
    expect(parsed.sex).toBeNull();
  });

  it('accepts null primary-house for unaffiliated characters', () => {
    const input = {
      slug: 'tormund', name: 'Tormund', sex: 'm',
      born: null, died: null,
      'primary-house': null,
      'also-of-houses': [], parents: [], spouses: [], children: [], titles: [],
      sources: [], draft: false,
    };
    const parsed = CharacterSchema.parse(input);
    expect(parsed['primary-house']).toBeNull();
  });

  it('rejects sex values other than m, f, or null', () => {
    const input = {
      slug: 'x', name: 'X', sex: 'other',
      born: null, died: null,
      'primary-house': 'stark',
      'also-of-houses': [], parents: [], spouses: [], children: [], titles: [],
      sources: [], draft: false,
    };
    expect(() => CharacterSchema.parse(input)).toThrow();
  });
});

describe('EventSchema', () => {
  it('parses a battle with both sides', () => {
    const input = {
      slug: 'red-wedding',
      name: 'The Red Wedding',
      type: 'betrayal',
      date: { year: 299, era: 'AC', precision: 'year' },
      location: 'the-twins',
      participants: [
        { side: 'stark', houses: ['stark', 'tully'] },
        { side: 'frey', houses: ['frey', 'bolton'] },
      ],
      outcome: 'stark-defeat',
      casualties: ['robb-stark'],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });

  it('allows location as coords for field battles', () => {
    const input = {
      slug: 'whispering-wood',
      name: 'Battle of the Whispering Wood',
      type: 'battle',
      date: { year: 298, era: 'AC', precision: 'year' },
      location: { x: 300, y: 400 },
      participants: [],
      outcome: 'stark-victory',
      casualties: [],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });
});
