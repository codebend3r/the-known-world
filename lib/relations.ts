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

function slugsByKey({
  entries,
}: {
  entries: ReadonlyArray<{ key: string; slug: string }>;
}): Map<string, string[]> {
  return new Map(
    [...Map.groupBy(entries, ({ key }) => key)].map(([key, group]) => [
      key,
      group.map(({ slug }) => slug),
    ]),
  );
}

export function buildRelationGraph(set: ContentSet): RelationGraph {
  const castleByHouse = slugsByKey({
    entries: set.castles.flatMap(({ frontmatter }) => {
      const houseSlug = frontmatter["liege-house"];
      return houseSlug ? [{ key: houseSlug, slug: frontmatter.slug }] : [];
    }),
  });

  const houseBySeat = set.houses.reduce((acc, house) => {
    const seat = house.frontmatter.seat;
    if (seat !== null) acc.set(seat, house.frontmatter.slug);
    return acc;
  }, new Map<string, string>());

  const membersByHouse = slugsByKey({
    entries: set.characters.flatMap(({ frontmatter }) => {
      const houseSlug = frontmatter["primary-house"];
      return houseSlug !== null
        ? [{ key: houseSlug, slug: frontmatter.slug }]
        : [];
    }),
  });

  const eventsByLocation = slugsByKey({
    entries: set.events.flatMap(({ frontmatter }) => {
      const loc = frontmatter.location;
      return typeof loc === "string"
        ? [{ key: loc, slug: frontmatter.slug }]
        : [];
    }),
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
