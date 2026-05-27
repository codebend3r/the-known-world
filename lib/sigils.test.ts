import { describe, it, expect } from 'vitest';
import {
  getSigilCell,
  getSigilBackgroundPosition,
  SIGIL_SPRITE_COLS,
  SIGIL_SPRITE_ROWS,
} from './sigils';

describe('getSigilCell', () => {
  it('maps the first slug to (0, 0)', () => {
    expect(getSigilCell('stark')).toEqual({ col: 0, row: 0 });
  });

  it('maps the last slug of the first row to the rightmost column', () => {
    expect(getSigilCell('greyjoy')).toEqual({ col: SIGIL_SPRITE_COLS - 1, row: 0 });
  });

  it('maps the first slug of the second row to (0, 1)', () => {
    expect(getSigilCell('tully')).toEqual({ col: 0, row: 1 });
  });

  it('maps the last slug to the bottom-right cell', () => {
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
  it('returns `0% 0%` for the top-left cell', () => {
    expect(getSigilBackgroundPosition({ col: 0, row: 0 })).toBe('0% 0%');
  });

  it('returns `100% 100%` for the bottom-right cell', () => {
    expect(
      getSigilBackgroundPosition({ col: SIGIL_SPRITE_COLS - 1, row: SIGIL_SPRITE_ROWS - 1 }),
    ).toBe('100% 100%');
  });
});
