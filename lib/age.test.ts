import { describe, it, expect } from 'vitest';
import { ageAtDeath } from '@/lib/age';

describe('ageAtDeath', () => {
  it('subtracts year-precision AC dates', () => {
    expect(
      ageAtDeath(
        { year: 259, era: 'AC', precision: 'year' },
        { year: 299, era: 'AC', precision: 'year' },
      ),
    ).toBe(40);
  });

  it('handles a BC birth crossing into AC', () => {
    expect(
      ageAtDeath(
        { year: -27, era: 'BC', precision: 'year' },
        { year: 37, era: 'AC', precision: 'year' },
      ),
    ).toBe(64);
  });

  it('returns null when born is null', () => {
    expect(
      ageAtDeath(null, { year: 299, era: 'AC', precision: 'year' }),
    ).toBeNull();
  });

  it('returns null when died is null (still alive)', () => {
    expect(
      ageAtDeath({ year: 259, era: 'AC', precision: 'year' }, null),
    ).toBeNull();
  });

  it('returns null when either date uses a non-AC/BC era', () => {
    expect(
      ageAtDeath(
        { year: 0, era: 'age-of-heroes', precision: 'era' },
        { year: 1, era: 'AC', precision: 'year' },
      ),
    ).toBeNull();
  });

  it('returns null when either date is only decade-precise', () => {
    expect(
      ageAtDeath(
        { year: 260, era: 'AC', precision: 'decade' },
        { year: 299, era: 'AC', precision: 'year' },
      ),
    ).toBeNull();
  });

  it('returns null when death precedes birth', () => {
    expect(
      ageAtDeath(
        { year: 300, era: 'AC', precision: 'year' },
        { year: 280, era: 'AC', precision: 'year' },
      ),
    ).toBeNull();
  });
});
