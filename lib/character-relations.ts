export type RelationRef = {
  slug: string;
  name: string;
  isLinkable: boolean;
};

type RelationSource = {
  name: string;
  placeholder: boolean;
};

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
