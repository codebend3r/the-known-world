import type { Character } from './schemas';

export function ageAtDeath(
  born: Character['born'],
  died: Character['died'],
): number | null {
  if (!born || !died) return null;
  if (born.era !== 'AC' && born.era !== 'BC') return null;
  if (died.era !== 'AC' && died.era !== 'BC') return null;
  if (born.precision !== 'year' && born.precision !== 'exact') return null;
  if (died.precision !== 'year' && died.precision !== 'exact') return null;
  const age = died.year - born.year;
  if (age < 0) return null;
  return age;
}
