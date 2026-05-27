import { describe, it, expect } from 'vitest';
import { hasSigil, getSigilSrc } from './sigils';

describe('hasSigil', () => {
  it('returns true for a known slug', () => {
    expect(hasSigil('stark')).toBe(true);
  });

  it('returns false for an unknown slug', () => {
    expect(hasSigil('not-a-house')).toBe(false);
  });
});

describe('getSigilSrc', () => {
  it('points at the per-house webp under `/sprites/sigils/`', () => {
    expect(getSigilSrc('targaryen')).toBe('/sprites/sigils/targaryen.webp');
  });
});
