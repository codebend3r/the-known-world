export function bySlug<T>(
  items: readonly { slug: string; frontmatter: T }[],
): Map<string, T> {
  return new Map(items.map((item) => [item.slug, item.frontmatter]));
}

export function compareByName(
  a: { name: string },
  b: { name: string },
): number {
  return a.name.localeCompare(b.name);
}
