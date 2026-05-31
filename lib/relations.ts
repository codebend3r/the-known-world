import type { Castle, House, Character, Event } from "@/lib/schemas";

type Loaded<T> = { frontmatter: T; body: string; slug: string };

export interface ContentSet {
  castles: Array<Loaded<Castle>>;
  houses: Array<Loaded<House>>;
  characters: Array<Loaded<Character>>;
  events: Array<Loaded<Event>>;
}

export interface RelationGraph {
  castleByHouse: Map<string, string[]>; // house slug → castle slugs whose liege-house is this house
  houseBySeat: Map<string, string>; // castle slug → house slug whose seat is this castle
  membersByHouse: Map<string, string[]>; // house slug → character slugs whose primary-house is this house
  eventsByLocation: Map<string, string[]>; // castle slug → event slugs located there
}

function pushTo<K>(map: Map<K, string[]>, key: K, value: string) {
  const existing = map.get(key) ?? [];
  existing.push(value);
  map.set(key, existing);
}

export function buildRelationGraph(set: ContentSet): RelationGraph {
  const castleByHouse = set.castles.reduce((acc, castle) => {
    const houseSlug = castle.frontmatter["liege-house"];
    if (houseSlug) pushTo(acc, houseSlug, castle.frontmatter.slug);
    return acc;
  }, new Map<string, string[]>());

  const houseBySeat = set.houses.reduce((acc, house) => {
    acc.set(house.frontmatter.seat, house.frontmatter.slug);
    return acc;
  }, new Map<string, string>());

  const membersByHouse = set.characters.reduce((acc, character) => {
    const houseSlug = character.frontmatter["primary-house"];
    if (houseSlug !== null) pushTo(acc, houseSlug, character.frontmatter.slug);
    return acc;
  }, new Map<string, string[]>());

  const eventsByLocation = set.events.reduce((acc, event) => {
    const loc = event.frontmatter.location;
    if (typeof loc === "string") pushTo(acc, loc, event.frontmatter.slug);
    return acc;
  }, new Map<string, string[]>());

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
    house.frontmatter.seat,
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
