/**
 * Lookups like `find`, `Map.get`, or a nullable return hand back a value that
 * may be missing. Narrowing here fails the test at the lookup, rather than as
 * an `undefined` that a fallback could quietly turn into a passing assertion.
 */
export function expectDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error(`expected a value, got ${String(value)}`);
  }
  return value;
}
