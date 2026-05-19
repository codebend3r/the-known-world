import { describe, it, expect } from 'vitest';
import {
  CastleSchema,
  HouseSchema,
  PersonSchema,
  EventSchema,
} from './schemas';

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

describe('PersonSchema', () => {
  it('parses a named person', () => {
    const input = {
      slug: 'eddard-stark',
      name: 'Eddard Stark',
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
    expect(() => PersonSchema.parse(input)).not.toThrow();
  });

  it('allows a placeholder person with null name dates', () => {
    const input = {
      slug: 'unnamed-stark-daughter',
      name: 'Unnamed Stark daughter',
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
    expect(() => PersonSchema.parse(input)).not.toThrow();
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
