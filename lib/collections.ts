export function bySlug<T>(
  items: readonly { slug: string; frontmatter: T }[],
): Map<string, T> {
  return new Map(items.map((item) => [item.slug, item.frontmatter]));
}

/** The first item for each key, in the order those first items appear. */
export function firstByKey<T>({
  items,
  keyOf,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
}): T[] {
  return [...Map.groupBy(items, keyOf).values()].map(([first]) => first);
}

export function compareByName(
  a: { name: string },
  b: { name: string },
): number {
  return a.name.localeCompare(b.name);
}
