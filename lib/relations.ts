import type { Castle, House, Character, Event } from '@/lib/schemas';

type Loaded<T> = { frontmatter: T; body: string; slug: string };

export interface ContentSet {
  castles: Array<Loaded<Castle>>;
  houses: Array<Loaded<House>>;
  characters: Array<Loaded<Character>>;
  events: Array<Loaded<Event>>;
}

export interface RelationGraph {
  castleByHouse: Map<string, string[]>;     // house slug → castle slugs whose liege-house is this house
  houseBySeat: Map<string, string>;         // castle slug → house slug whose seat is this castle
  membersByHouse: Map<string, string[]>;    // house slug → character slugs whose primary-house is this house
  eventsByLocation: Map<string, string[]>;  // castle slug → event slugs located there
}

export function buildRelationGraph(set: ContentSet): RelationGraph {
  const castleByHouse = new Map<string, string[]>();
  const houseBySeat = new Map<string, string>();
  const membersByHouse = new Map<string, string[]>();
  const eventsByLocation = new Map<string, string[]>();

  for (const castle of set.castles) {
    const houseSlug = castle.frontmatter['liege-house'];
    if (houseSlug) {
      const existing = castleByHouse.get(houseSlug) ?? [];
      existing.push(castle.frontmatter.slug);
      castleByHouse.set(houseSlug, existing);
    }
  }

  for (const house of set.houses) {
    houseBySeat.set(house.frontmatter.seat, house.frontmatter.slug);
  }

  for (const character of set.characters) {
    const houseSlug = character.frontmatter['primary-house'];
    if (houseSlug === null) continue;
    const existing = membersByHouse.get(houseSlug) ?? [];
    existing.push(character.frontmatter.slug);
    membersByHouse.set(houseSlug, existing);
  }

  for (const event of set.events) {
    const loc = event.frontmatter.location;
    if (typeof loc === 'string') {
      const existing = eventsByLocation.get(loc) ?? [];
      existing.push(event.frontmatter.slug);
      eventsByLocation.set(loc, existing);
    }
  }

  return { castleByHouse, houseBySeat, membersByHouse, eventsByLocation };
}

export function findOrphanSlugs(set: ContentSet): string[] {
  const allSlugs = new Set<string>([
    ...set.castles.map((c) => c.frontmatter.slug),
    ...set.houses.map((h) => h.frontmatter.slug),
    ...set.characters.map((p) => p.frontmatter.slug),
    ...set.events.map((e) => e.frontmatter.slug),
  ]);

  const referenced = new Set<string>();

  for (const castle of set.castles) {
    if (castle.frontmatter['liege-house']) referenced.add(castle.frontmatter['liege-house']);
    for (const s of castle.frontmatter['sworn-houses']) referenced.add(s);
  }
  for (const house of set.houses) {
    referenced.add(house.frontmatter.seat);
    if (house.frontmatter.liege) referenced.add(house.frontmatter.liege);
    for (const s of house.frontmatter['sworn-from']) referenced.add(s);
    for (const s of house.frontmatter['cadet-houses']) referenced.add(s);
  }
  for (const character of set.characters) {
    if (character.frontmatter['primary-house']) {
      referenced.add(character.frontmatter['primary-house']);
    }
    for (const s of character.frontmatter.parents) referenced.add(s);
    for (const s of character.frontmatter.spouses) referenced.add(s);
    for (const s of character.frontmatter.children) referenced.add(s);
  }
  for (const event of set.events) {
    if (typeof event.frontmatter.location === 'string') referenced.add(event.frontmatter.location);
    for (const p of event.frontmatter.participants) {
      for (const h of p.houses) referenced.add(h);
    }
    for (const s of event.frontmatter.casualties) referenced.add(s);
  }

  const orphans: string[] = [];
  for (const slug of referenced) {
    if (!allSlugs.has(slug)) orphans.push(slug);
  }
  return orphans;
}
