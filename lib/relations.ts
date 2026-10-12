import type { Collections } from "@/lib/content";

export type ContentSet = Pick<
  Collections,
  "castles" | "houses" | "characters" | "events"
>;

export type RelationGraph = {
  castleByHouse: Map<string, string[]>; // house slug → castle slugs whose liege-house is this house
  houseBySeat: Map<string, string>; // castle slug → house slug whose seat is this castle
  membersByHouse: Map<string, string[]>; // house slug → character slugs whose primary-house is this house
  eventsByLocation: Map<string, string[]>; // castle slug → event slugs located there
};

function slugsByKey<T extends { slug: string }>({
  items,
  keyOf,
}: {
  items: ReadonlyArray<{ frontmatter: T }>;
  keyOf: (frontmatter: T) => string | null | undefined;
}): Map<string, string[]> {
  const keyed = items.flatMap(({ frontmatter }) => {
    const key = keyOf(frontmatter);
    return key ? [{ key, slug: frontmatter.slug }] : [];
  });
  return new Map(
    [...Map.groupBy(keyed, ({ key }) => key)].map(([key, group]) => [
      key,
      group.map(({ slug }) => slug),
    ]),
  );
}

export function buildRelationGraph(set: ContentSet): RelationGraph {
  const castleByHouse = slugsByKey({
    items: set.castles,
    keyOf: (fm) => fm["liege-house"],
  });

  const houseBySeat = new Map<string, string>(
    set.houses.flatMap(({ frontmatter }) =>
      frontmatter.seat === null ? [] : [[frontmatter.seat, frontmatter.slug]],
    ),
  );

  const membersByHouse = slugsByKey({
    items: set.characters,
    keyOf: (fm) => fm["primary-house"],
  });

  const eventsByLocation = slugsByKey({
    items: set.events,
    keyOf: (fm) => (typeof fm.location === "string" ? fm.location : null),
  });

  return { castleByHouse, houseBySeat, membersByHouse, eventsByLocation };
}

export function findOrphanSlugs(set: ContentSet): string[] {
  const allSlugs = new Set<string>([
    ...set.castles.map((c) => c.frontmatter.slug),
    ...set.houses.map((h) => h.frontmatter.slug),
    ...set.characters.map((p) => p.frontmatter.slug),
    ...set.events.map((e) => e.frontmatter.slug),
  ]);

  const castleRefs = set.castles.flatMap((castle) => [
    ...(castle.frontmatter["liege-house"]
      ? [castle.frontmatter["liege-house"]]
      : []),
    ...castle.frontmatter["sworn-houses"],
  ]);

  const houseRefs = set.houses.flatMap((house) => [
    ...(house.frontmatter.seat ? [house.frontmatter.seat] : []),
    ...(house.frontmatter.liege ? [house.frontmatter.liege] : []),
    ...house.frontmatter["sworn-from"],
    ...house.frontmatter["cadet-houses"],
  ]);

  const characterRefs = set.characters.flatMap((character) => [
    ...(character.frontmatter["primary-house"]
      ? [character.frontmatter["primary-house"]]
      : []),
    ...character.frontmatter.parents,
    ...character.frontmatter.spouses,
    ...character.frontmatter.children,
  ]);

  const eventRefs = set.events.flatMap((event) => [
    ...(typeof event.frontmatter.location === "string"
      ? [event.frontmatter.location]
      : []),
    ...event.frontmatter.participants.flatMap((p) => p.houses),
    ...event.frontmatter.casualties,
  ]);

  const referenced = new Set<string>([
    ...castleRefs,
    ...houseRefs,
    ...characterRefs,
    ...eventRefs,
  ]);

  return [...referenced].filter((slug) => !allSlugs.has(slug));
}
