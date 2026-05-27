import { describe, it, expect } from 'vitest';
import {
  getSigilCell,
  getSigilBackgroundPosition,
  SIGIL_SPRITE_COLS,
  SIGIL_SPRITE_ROWS,
} from './sigils';

describe('getSigilCell', () => {
  it('returns the top-left cell for the first slug', () => {
    expect(getSigilCell('stark')).toEqual({ col: 0, row: 0 });
  });

  it('returns the bottom-right cell for the last slug', () => {
    expect(getSigilCell('grafton')).toEqual({
      col: SIGIL_SPRITE_COLS - 1,
      row: SIGIL_SPRITE_ROWS - 1,
    });
  });

  it('returns null for an unknown slug', () => {
    expect(getSigilCell('not-a-house')).toBeNull();
  });
});

describe('getSigilBackgroundPosition', () => {
  it('places the top-left cell at 0% 0%', () => {
    expect(getSigilBackgroundPosition({ col: 0, row: 0 })).toBe('0% 0%');
  });

  it('places the bottom-right cell at 100% 100%', () => {
    expect(
      getSigilBackgroundPosition({
        col: SIGIL_SPRITE_COLS - 1,
        row: SIGIL_SPRITE_ROWS - 1,
      }),
    ).toBe('100% 100%');
  });
});
