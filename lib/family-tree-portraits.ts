import type { Character } from "@/lib/schemas";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

export type EnrichedTreeSpouse = TreeSpouse & {
  portrait: string | null;
};

export type EnrichedTreeNode = Omit<TreeNode, "spouses" | "children"> & {
  portrait: string | null;
  spouses: EnrichedTreeSpouse[];
  children: EnrichedTreeNode[];
};

export type FindPortrait = (query: {
  slug: string;
  sex: Character["sex"];
}) => Promise<string>;

export async function enrichTreeWithPortraits({
  roots,
  findPortrait,
}: {
  roots: TreeNode[];
  findPortrait: FindPortrait;
}): Promise<EnrichedTreeNode[]> {
  const cache = new Map<string, Promise<string>>();
  const lookup: FindPortrait = ({ slug, sex }) => {
    const existing = cache.get(slug);
    if (existing) return existing;
    const next = findPortrait({ slug, sex });
    cache.set(slug, next);
    return next;
  };

  const enrichSpouse = async (s: TreeSpouse): Promise<EnrichedTreeSpouse> => {
    const portrait =
      s.slug && !s.placeholder
        ? await lookup({ slug: s.slug, sex: s.sex })
        : null;
    return { ...s, portrait };
  };

  const enrichNode = async (n: TreeNode): Promise<EnrichedTreeNode> => {
    const portrait =
      n.placeholder || n.external
        ? null
        : await lookup({ slug: n.slug, sex: n.sex });
    const [spouses, children] = await Promise.all([
      Promise.all(n.spouses.map(enrichSpouse)),
      Promise.all(n.children.map(enrichNode)),
    ]);
    return { ...n, portrait, spouses, children };
  };

  return Promise.all(roots.map(enrichNode));
}
