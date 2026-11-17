import type { Loaded } from "@/lib/content";
import { exhaustiveList } from "@/lib/exhaustive-list";
import type { Battle, Castle, Coords, Event, House } from "@/lib/schemas";

type CastleType = Castle["type"];

export type { Coords };

/**
 * Atlas space: the coordinate system every `coords` field in `content/` is
 * written in, and the viewBox `MapStage` draws into. It is a Westeros-only
 * schematic space, **not** natural pixels of any image in `public/map/`.
 * Placing a marker means picking an (x, y) inside this box; nothing else.
 */
export const MAP_BOUNDS = { width: 800, height: 1400 } as const;

/**
 * The raster `WorldMap` draws on `/maps`, and the natural-pixel space every
 * `world-map` field in `content/castles/` is written in. Nothing here relates
 * to `MAP_BOUNDS`: the raster is the whole known world, the atlas is Westeros.
 */
export const WORLD_MAP_RASTER = {
  src: "/map/the-known-world-enhanced.jpg",
  width: 10000,
  height: 8300,
} as const;

/**
 * Radius, in natural pixels, of the (invisible) click target around each
 * printed seat icon — kept tight since neighbouring towns (Hayford and Rosby
 * by King's Landing, Lordsport by Pyke) sit only ~50-100 natural pixels away.
 */
export const WORLD_MAP_MARKER_RADIUS = 25;

/** A hotspot on the `/maps` raster: natural pixels plus where it links. */
export type WorldMapMarker = {
  slug: string;
  name: string;
  href: string;
  x: number;
  y: number;
  type: CastleType;
  house?: string;
  summary: string;
};

export const ALL_CASTLE_TYPES = exhaustiveList<CastleType>()([
  "castle",
  "town",
  "ruin",
  "watchtower",
  "holdfast",
]);

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
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
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

function isWithin({
  point: { x, y },
  bounds,
}: {
  point: Coords;
  bounds: { width: number; height: number };
}): boolean {
  return x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;
}

export function isWithinMapBounds(point: Coords): boolean {
  return isWithin({ point, bounds: MAP_BOUNDS });
}

export function isWithinWorldMapRaster(point: Coords): boolean {
  return isWithin({ point, bounds: WORLD_MAP_RASTER });
}

/**
 * Hotspots closer than one diameter share pixels, and whichever paints last
 * takes every click in the overlap, so the other seat is partly unclickable.
 */
export function doWorldMapHotspotsOverlap({
  a,
  b,
}: {
  a: Coords;
  b: Coords;
}): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 2 * WORLD_MAP_MARKER_RADIUS;
}

/**
 * The route segment each layer links into. Every castle type shares the
 * `castles` collection; `battle` and `event` have their own. Declared as a
 * table rather than a branch chain so a new entry in `MAP_LAYERS` fails to
 * compile here instead of silently linking to `/castles/`.
 */
const LAYER_ROUTE = {
  castle: "castles",
  town: "castles",
  ruin: "castles",
  watchtower: "castles",
  holdfast: "castles",
  battle: "battles",
  event: "events",
} as const satisfies Record<MapLayer, string>;

export function placementHref({
  layer,
  slug,
}: {
  layer: MapLayer;
  slug: string;
}): string {
  return `/${LAYER_ROUTE[layer]}/${slug}/`;
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
      href: placementHref({
        layer: entry.frontmatter.type,
        slug: entry.frontmatter.slug,
      }),
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
          href: placementHref({ layer, slug: entry.frontmatter.slug }),
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

const SUMMARY_MAX_LENGTH = 180;

/**
 * The popover's blurb: the first prose paragraph of a castle body, flattened
 * to plain text. Spoiler spans (`||death|...||`) are dropped outright, since a
 * hover card has no spoiler toggle to hide them behind.
 */
export function summarizeBody(body: string): string {
  const paragraph =
    body
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find((block) => !!block && !/^(#|[-*>|]|\d+\.)/.test(block)) ?? "";
  const plain = paragraph
    .replace(/\|\|[a-z-]+\|.*?\|\|/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= SUMMARY_MAX_LENGTH) return plain;
  const cut = plain.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : SUMMARY_MAX_LENGTH).replace(/[,;:.\s]+$/, "")}…`;
}

/**
 * Every hotspot the `/maps` raster should draw. Drafts never place, because
 * `generateStaticParams` skips them and the pin would link into the void; a
 * castle with no `world-map` field is simply absent. A liege house that does
 * not resolve simply leaves the popover without a house line.
 */
export function selectWorldMapMarkers({
  castles,
  houses,
}: {
  castles: ReadonlyArray<Loaded<Castle>>;
  houses: ReadonlyArray<Loaded<House>>;
}): WorldMapMarker[] {
  const houseNames = new Map(
    houses.map(({ frontmatter }) => [frontmatter.slug, frontmatter.name]),
  );
  return castles.flatMap(({ frontmatter, body }) => {
    const pixel = frontmatter["world-map"];
    if (frontmatter.draft || !pixel) return [];
    const liege = frontmatter["liege-house"];
    const house = liege ? houseNames.get(liege) : undefined;
    return [
      {
        slug: frontmatter.slug,
        name: frontmatter.name,
        href: placementHref({
          layer: frontmatter.type,
          slug: frontmatter.slug,
        }),
        x: pixel.x,
        y: pixel.y,
        type: frontmatter.type,
        ...(house ? { house } : {}),
        summary: summarizeBody(body),
      },
    ];
  });
}

/** A viewer's size on screen, in CSS pixels. */
export type ViewerSize = { w: number; h: number };

/** The raster's natural pixel size. */
export type NaturalSize = { width: number; height: number };

/**
 * Where the raster sits inside a viewer that draws it fitted and centred:
 * `fitScale` is natural-to-viewer pixels, `offsetX`/`offsetY` the letterbox.
 */
export type FitGeometry = {
  fitScale: number;
  drawnWidth: number;
  drawnHeight: number;
  offsetX: number;
  offsetY: number;
};

/** No viewer yet (not measured) collapses everything to zero. */
export function fitGeometry({
  viewer,
  natural,
}: {
  viewer: ViewerSize | null;
  natural: NaturalSize;
}): FitGeometry {
  if (!viewer) {
    return {
      fitScale: 0,
      drawnWidth: 0,
      drawnHeight: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }
  const fitScale = Math.min(
    viewer.w / natural.width,
    viewer.h / natural.height,
  );
  const drawnWidth = natural.width * fitScale;
  const drawnHeight = natural.height * fitScale;
  return {
    fitScale,
    drawnWidth,
    drawnHeight,
    offsetX: (viewer.w - drawnWidth) / 2,
    offsetY: (viewer.h - drawnHeight) / 2,
  };
}

/** A natural-pixel point on the raster, in the fitted viewer's SVG space. */
export function naturalToViewer({
  geometry,
  point,
}: {
  geometry: FitGeometry;
  point: Coords;
}): Coords {
  return {
    x: geometry.offsetX + point.x * geometry.fitScale,
    y: geometry.offsetY + point.y * geometry.fitScale,
  };
}

/** The pan/zoom matrix entries that matter: uniform scale `a`, offset `e`/`f`. */
export type ViewMatrix = { a: number; e: number; f: number };

/**
 * When the viewer resizes, the fitted raster re-centres itself but the pan/zoom
 * matrix does not, so the view would jump. This keeps the same natural-pixel
 * point at the viewer's centre, at the same effective zoom.
 */
export function recenterOnResize({
  current,
  prev,
  next,
  natural,
}: {
  current: ViewMatrix;
  prev: { size: ViewerSize; fitScale: number };
  next: { size: ViewerSize; fitScale: number };
  natural: NaturalSize;
}): ViewMatrix {
  const prevOffsetX = (prev.size.w - natural.width * prev.fitScale) / 2;
  const prevOffsetY = (prev.size.h - natural.height * prev.fitScale) / 2;
  const centeredSVGX = (prev.size.w / 2 - current.e) / current.a;
  const centeredSVGY = (prev.size.h / 2 - current.f) / current.a;
  const centeredNaturalX = (centeredSVGX - prevOffsetX) / prev.fitScale;
  const centeredNaturalY = (centeredSVGY - prevOffsetY) / prev.fitScale;

  const drawnWidth = natural.width * next.fitScale;
  const drawnHeight = natural.height * next.fitScale;
  const nextZoom = current.a * (prev.fitScale / next.fitScale);
  const nextSVGX =
    (next.size.w - drawnWidth) / 2 + centeredNaturalX * next.fitScale;
  const nextSVGY =
    (next.size.h - drawnHeight) / 2 + centeredNaturalY * next.fitScale;

  return {
    a: nextZoom,
    e: next.size.w / 2 - nextZoom * nextSVGX,
    f: next.size.h / 2 - nextZoom * nextSVGY,
  };
}

/**
 * Places a fixed-width card anchored on a pin: slid sideways to stay inside
 * the stage (`shift`), flipped below the pin when there is no room above, and
 * with the arrow offset (`pinX`) slid back so it still points at the pin.
 */
export function popoverPlacement({
  anchor,
  stageWidth,
  width,
  heightEstimate,
  gutter,
}: {
  anchor: Coords;
  stageWidth: number;
  width: number;
  heightEstimate: number;
  gutter: number;
}): { shift: number; pinX: number; placement: "above" | "below" } {
  const halfWidth = width / 2;
  const lowest = Math.min(halfWidth + gutter, stageWidth / 2);
  const highest = Math.max(stageWidth - halfWidth - gutter, stageWidth / 2);
  const clampedX = Math.min(Math.max(anchor.x, lowest), highest);
  const shift = clampedX - anchor.x;
  return {
    shift,
    pinX: halfWidth - shift,
    placement: anchor.y < heightEstimate ? "below" : "above",
  };
}
