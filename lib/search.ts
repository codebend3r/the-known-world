const ALIAS_PENALTY = 4;

function rankByName({ name, q }: { name: string; q: string }): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(` ${q}`)) return 2;
  if (n.includes(q)) return 3;
  return Infinity;
}

function bestAliasRank({
  aliases,
  q,
}: {
  aliases: readonly string[];
  q: string;
}): number {
  return aliases.reduce(
    (best, alias) => Math.min(best, rankByName({ name: alias, q })),
    Infinity,
  );
}

export function filterByName<
  T extends { name: string; aliases?: readonly string[] },
>({ items, query }: { items: readonly T[]; query: string }): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items
    .map((item, i) => {
      const nameRank = rankByName({ name: item.name, q });
      const aliasRank =
        bestAliasRank({ aliases: item.aliases ?? [], q }) + ALIAS_PENALTY;
      return { item, i, r: Math.min(nameRank, aliasRank) };
    })
    .filter((m) => m.r !== Infinity)
    .toSorted((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.i - b.i;
    })
    .map((m) => m.item);
}
