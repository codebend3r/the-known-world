function rankByName(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(` ${q}`)) return 2;
  if (n.includes(q)) return 3;
  return Infinity;
}

export function filterByName<T extends { name: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items
    .map((item, i) => ({ item, i, r: rankByName(item.name, q) }))
    .filter((m) => m.r !== Infinity)
    .sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.i - b.i;
    })
    .map((m) => m.item);
}
