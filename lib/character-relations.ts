import type { Character } from "@/lib/schemas";

export type RelationRef = {
  slug: string;
  name: string;
  isLinkable: boolean;
};

type RelationSource = Pick<Character, "name" | "placeholder">;

export function resolveRelations({
  slugs,
  charactersBySlug,
}: {
  slugs: readonly string[];
  charactersBySlug: ReadonlyMap<string, RelationSource>;
}): RelationRef[] {
  return slugs.map((slug) => {
    const character = charactersBySlug.get(slug);
    if (!character) {
      return { slug, name: slug, isLinkable: false };
    }
    return {
      slug,
      name: character.name,
      isLinkable: !character.placeholder,
    };
  });
}
