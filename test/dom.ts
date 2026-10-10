type ElementConstructor<T extends Element> = new (...args: never[]) => T;

function describeValue(value: unknown): string {
  if (value instanceof Element) return `<${value.tagName.toLowerCase()}>`;
  return String(value);
}

/**
 * Queries hand back `Element` or `HTMLElement`, and a test usually needs the
 * concrete element to read `value`, `disabled`, or `options`. Narrowing at
 * runtime keeps that a checked claim, so a missing or wrong element fails here
 * by name rather than as an `undefined` deeper in the assertion.
 */
export function expectElement<T extends Element>({
  element,
  type,
}: {
  element: unknown;
  type: ElementConstructor<T>;
}): T {
  if (element instanceof type) return element;
  throw new Error(`expected ${type.name}, got ${describeValue(element)}`);
}
