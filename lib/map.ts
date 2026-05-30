import type { Castle } from '@/lib/schemas';

type Loaded<T> = { frontmatter: T; body: string; slug: string };
type CastleType = Castle['type'];

export const ALL_CASTLE_TYPES: CastleType[] = ['castle', 'town', 'ruin', 'watchtower', 'holdfast'];

export function selectVisibleCastles(
  all: Array<Loaded<Castle>>,
  enabledTypes: Set<CastleType>,
): Array<Loaded<Castle>> {
  return all.filter((c) => !c.frontmatter.draft && enabledTypes.has(c.frontmatter.type));
}
