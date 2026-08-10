import type { Battle, Castle, Coords, Event } from "@/lib/schemas";

type Loaded<T> = { frontmatter: T; body: string; slug: string };
type CastleType = Castle["type"];

export type { Coords };

/**
 * Atlas space: the coordinate system every `coords` field in `content/` is
 * written in, and the viewBox `MapStage` draws into. It is a Westeros-only
 * schematic space, **not** natural pixels of any image in `public/map/`.
 * Placing a marker means picking an (x, y) inside this box; nothing else.
 */
export const MAP_BOUNDS = { width: 800, height: 1400 } as const;

export const ALL_CASTLE_TYPES: CastleType[] = [
  "castle",
  "town",
  "ruin",
  "watchtower",
  "holdfast",
];

/**
 * One toggleable layer each. The five castle types keep their own layer so the
 * existing filter behaviour is unchanged; `battle` and `event` are the two
 * collections that can now carry coordinates of their own.
 */
export const MAP_LAYERS = [
  ...ALL_CASTLE_TYPES,
  "battle",
  "event",
] as const satisfies readonly string[];

export type MapLayer = (typeof MAP_LAYERS)[number];

/** A resolved marker: where it sits, which layer owns it, where it links. */
export type MapPlacement = {
  slug: string;
  name: string;
  layer: MapLayer;
  href: string;
  coords: Coords;
};

export function isCoords(value: unknown): value is Coords {
  if (typeof value !== "object" || value === null) return false;
  const record: Record<string, unknown> = { ...value };
  return typeof record.x === "number" && typeof record.y === "number";
}

/**
 * `EventSchema.location` is a `string | Coords` union that predates the
 * dedicated `coords` field, so an event can express a placement two ways. The
 * explicit field wins; the union is the fallback. Battles have no such union,
 * and castles always carry `coords`.
 */
export function entryCoords(frontmatter: {
  coords?: Coords;
  location?: string | Coords;
}): Coords | null {
  const explicit = frontmatter.coords;
  if (explicit) return explicit;
  const location = frontmatter.location;
  return isCoords(location) ? location : null;
}

export function isWithinMapBounds({ x, y }: Coords): boolean {
  return x >= 0 && x <= MAP_BOUNDS.width && y >= 0 && y <= MAP_BOUNDS.height;
}

export function placementHref({
  layer,
  slug,
}: {
  layer: MapLayer;
  slug: string;
}): string {
  if (layer === "battle") return `/battles/${slug}/`;
  if (layer === "event") return `/events/${slug}/`;
  return `/castles/${slug}/`;
}

export function selectVisibleCastles({
  castles,
  layers,
}: {
  castles: ReadonlyArray<Loaded<Castle>>;
  layers: ReadonlySet<MapLayer>;
}): Array<Loaded<Castle>> {
  return castles.filter(
    (entry) => !entry.frontmatter.draft && layers.has(entry.frontmatter.type),
  );
}

/**
 * Every marker the map should draw, in one list. Drafts never place, and an
 * entry with no coordinates is simply absent rather than defaulted to (0, 0):
 * a defaulted marker would land in the Shivering Sea and read as real.
 */
export function selectPlacements({
  castles,
  battles,
  events,
  layers,
}: {
  castles: ReadonlyArray<Loaded<Castle>>;
  battles: ReadonlyArray<Loaded<Battle>>;
  events: ReadonlyArray<Loaded<Event>>;
  layers: ReadonlySet<MapLayer>;
}): MapPlacement[] {
  const castlePlacements = selectVisibleCastles({ castles, layers }).map(
    (entry) => ({
      slug: entry.frontmatter.slug,
      name: entry.frontmatter.name,
      layer: entry.frontmatter.type,
      href: placementHref({ layer: entry.frontmatter.type, slug: entry.slug }),
      coords: entry.frontmatter.coords,
    }),
  );

  const placeCollection = ({
    entries,
    layer,
  }: {
    entries: ReadonlyArray<Loaded<Battle> | Loaded<Event>>;
    layer: MapLayer;
  }): MapPlacement[] => {
    if (!layers.has(layer)) return [];
    return entries.flatMap((entry) => {
      if (entry.frontmatter.draft) return [];
      const coords = entryCoords(entry.frontmatter);
      if (!coords) return [];
      return [
        {
          slug: entry.frontmatter.slug,
          name: entry.frontmatter.name,
          layer,
          href: placementHref({ layer, slug: entry.slug }),
          coords,
        },
      ];
    });
  };

  return [
    ...castlePlacements,
    ...placeCollection({ entries: battles, layer: "battle" }),
    ...placeCollection({ entries: events, layer: "event" }),
  ];
}
