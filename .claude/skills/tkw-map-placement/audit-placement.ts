/**
 * Audits every `coords` field in `content/` against the atlas space that
 * `MapStage` draws into, and reports what could be placed but is not:
 *
 *   COVERAGE        how many entries in each collection carry coordinates
 *   OUT OF BOUNDS   a coordinate outside the 800x1400 atlas box
 *   STACKED         several entries on one point, flagged UNANCHORED when no
 *                   castle sits there to explain the reuse
 *   CLUSTERED       distinct points within CLUSTER_RADIUS of each other
 *   PLACEABLE       an entry whose `location` names a castle that has coords,
 *                   while the entry itself has none
 *   NO CASTLE MATCH the remainder, which needs a judgement call or cannot be
 *                   placed at all
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-map-placement/audit-placement.ts
 *   bun .claude/skills/tkw-map-placement/audit-placement.ts --json
 *
 * Read-only. Writes no markdown and moves no marker.
 *
 * Bounds and the coordinate extraction rule come from `lib/map.ts` so the
 * audit, the renderer, and the CI integrity check cannot disagree.
 */
import { loadAllBattles, loadAllCastles, loadAllEvents } from "@/lib/content";
import { MAP_BOUNDS, entryCoords, isWithinMapBounds } from "@/lib/map";

/**
 * Structurally the same as `Coords` in `lib/schemas.ts`, declared locally
 * because tsconfig `include` globs skip dot-directories: `.claude/**` is
 * outside the project, so `tsgo` and the type-aware lint cannot resolve a
 * `@/`-aliased type import from here. Runtime imports resolve fine through
 * Bun, which reads the same `paths` mapping.
 */
type Coords = { x: number; y: number };

/** Two markers closer than this in atlas units overlap at every zoom level. */
const CLUSTER_RADIUS = 5;

type CollectionName = "castles" | "battles" | "events";

type Entry = {
  collection: CollectionName;
  slug: string;
  name: string;
  location: string | null;
  coords: Coords | null;
};

type Stack = {
  coords: Coords;
  members: string[];
  anchored: boolean;
};

type Pair = {
  a: string;
  b: string;
  distance: number;
};

type Placeable = {
  collection: CollectionName;
  slug: string;
  location: string;
  castle: string;
  coords: Coords;
};

/**
 * Free-text `location` strings name a place in prose ("Harrenhal, on the shore
 * of the Gods Eye"), so matching is by whole word against the castle name with
 * its leading article dropped. Substring matching would let `The Tor` swallow
 * every location containing "historic", "Torrhen", or "victor".
 */
function nameVariants(name: string): string[] {
  const bare = name.replace(/^the\s+/i, "");
  return bare === name ? [name] : [name, bare];
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Both sides are already normalised to space-separated words, so a match is
 *  a contiguous run of whole words rather than a substring. */
function namesWholeWord({
  haystack,
  needle,
}: {
  haystack: string;
  needle: string;
}): boolean {
  const words = haystack.split(" ");
  const target = needle.split(" ");
  return words.some(
    (_, index) =>
      words.slice(index, index + target.length).join(" ") === needle,
  );
}

function distance(a: Coords, b: Coords): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const [castles, battles, events] = await Promise.all([
  loadAllCastles(),
  loadAllBattles(),
  loadAllEvents(),
]);

const entries: Entry[] = [
  ...castles.map((entry) => ({
    collection: "castles" as const,
    slug: entry.slug,
    name: entry.frontmatter.name,
    location: null,
    coords: entryCoords(entry.frontmatter),
  })),
  ...battles.map((entry) => ({
    collection: "battles" as const,
    slug: entry.slug,
    name: entry.frontmatter.name,
    location: entry.frontmatter.location ?? null,
    coords: entryCoords(entry.frontmatter),
  })),
  ...events.map((entry) => ({
    collection: "events" as const,
    slug: entry.slug,
    name: entry.frontmatter.name,
    location:
      typeof entry.frontmatter.location === "string"
        ? entry.frontmatter.location
        : null,
    coords: entryCoords(entry.frontmatter),
  })),
];

const collections: CollectionName[] = ["castles", "battles", "events"];

const coverage = collections.map((collection) => {
  const group = entries.filter((entry) => entry.collection === collection);
  const placed = group.filter((entry) => !!entry.coords);
  return {
    collection,
    placed: placed.length,
    total: group.length,
    percent: group.length === 0 ? 0 : (placed.length / group.length) * 100,
  };
});

const outOfBounds = entries.flatMap((entry) => {
  const coords = entry.coords;
  if (!coords || isWithinMapBounds(coords)) return [];
  return [{ collection: entry.collection, slug: entry.slug, coords }];
});

const placed = entries.flatMap((entry) =>
  !!entry.coords
    ? [
        {
          id: `${entry.collection}/${entry.slug}`,
          collection: entry.collection,
          coords: entry.coords,
        },
      ]
    : [],
);

const points: Stack[] = [
  ...placed
    .reduce<Map<string, typeof placed>>((groups, entry) => {
      const key = `${entry.coords.x},${entry.coords.y}`;
      return groups.set(key, [...(groups.get(key) ?? []), entry]);
    }, new Map())
    .values(),
].map((group) => ({
  coords: group[0].coords,
  members: group.map((entry) => entry.id),
  anchored: group.some((entry) => entry.collection === "castles"),
}));

/**
 * Several entries on one point is the intended shape when a battle or event
 * reuses its seat's coordinates, so a stack is only suspicious when no castle
 * anchors it: that is a copy-paste, not a siege.
 */
const stacks = points
  .filter((point) => point.members.length > 1)
  .sort((a, b) => b.members.length - a.members.length);

/**
 * Distinct points close enough that their markers overlap at every zoom.
 * Compared point to point, not entry to entry, so an eleven-entry stack next
 * to a two-entry stack reports as one line rather than twenty-two.
 */
const clustered: Pair[] = points.flatMap((left, index) =>
  points.slice(index + 1).flatMap((right) => {
    const gap = distance(left.coords, right.coords);
    return gap > CLUSTER_RADIUS
      ? []
      : [
          {
            a: `${left.members[0]}${left.members.length > 1 ? ` +${left.members.length - 1}` : ""}`,
            b: `${right.members[0]}${right.members.length > 1 ? ` +${right.members.length - 1}` : ""}`,
            distance: gap,
          },
        ];
  }),
);

const castleIndex = castles.flatMap((entry) =>
  nameVariants(entry.frontmatter.name).map((variant) => ({
    slug: entry.slug,
    needle: normalise(variant),
    coords: entry.frontmatter.coords,
  })),
);

const placeable: Placeable[] = entries.flatMap((entry) => {
  if (!!entry.coords || !entry.location) return [];
  const haystack = normalise(entry.location);
  const matches = castleIndex.filter((candidate) =>
    namesWholeWord({ haystack, needle: candidate.needle }),
  );
  const slugs = [...new Set(matches.map((match) => match.slug))];
  if (slugs.length !== 1) return [];
  const match = matches[0];
  return [
    {
      collection: entry.collection,
      slug: entry.slug,
      location: entry.location,
      castle: match.slug,
      coords: match.coords,
    },
  ];
});

const unplaceable = entries.filter(
  (entry) =>
    !entry.coords &&
    !placeable.some(
      (candidate) =>
        candidate.collection === entry.collection &&
        candidate.slug === entry.slug,
    ),
);

if (Bun.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        bounds: MAP_BOUNDS,
        clusterRadius: CLUSTER_RADIUS,
        coverage,
        outOfBounds,
        stacks,
        clustered,
        placeable,
        unplaceable: unplaceable.map(({ collection, slug, location }) => ({
          collection,
          slug,
          location,
        })),
      },
      null,
      2,
    ),
  );
} else {
  const point = ({ x, y }: Coords) => `(${x}, ${y})`;

  console.log(
    `ATLAS SPACE ${MAP_BOUNDS.width}x${MAP_BOUNDS.height}, cluster radius ${CLUSTER_RADIUS}\n`,
  );

  console.log("PLACEMENT COVERAGE");
  coverage.forEach(({ collection, placed, total, percent }) =>
    console.log(
      `  ${collection.padEnd(9)}${String(placed).padStart(4)}/${String(total).padEnd(5)}${percent.toFixed(0)}%`,
    ),
  );

  console.log(`\nOUT OF BOUNDS (${outOfBounds.length})`);
  console.log(
    outOfBounds.length === 0
      ? "  none"
      : outOfBounds
          .map(
            ({ collection, slug, coords }) =>
              `  ${collection}/${slug}  ${point(coords)}`,
          )
          .join("\n"),
  );

  const unanchored = stacks.filter((stack) => !stack.anchored);
  console.log(
    `\nSTACKED POINTS (${stacks.length}, ${unanchored.length} with no castle to anchor them)`,
  );
  console.log(
    stacks.length === 0
      ? "  none"
      : stacks
          .map(
            ({ coords, members, anchored }) =>
              `  ${point(coords)} ${anchored ? "" : "UNANCHORED "}${members.length} entries\n    ${members.join("\n    ")}`,
          )
          .join("\n"),
  );

  console.log(
    `\nCLUSTERED WITHIN ${CLUSTER_RADIUS} UNITS (${clustered.length})`,
  );
  console.log(
    clustered.length === 0
      ? "  none"
      : clustered
          .map(
            ({ a, b, distance: gap }) =>
              `  ${a} ~ ${b}  ${gap.toFixed(1)} units apart`,
          )
          .join("\n"),
  );

  console.log(`\nPLACEABLE, UNPLACED (${placeable.length})`);
  console.log(
    placeable.length === 0
      ? "  none"
      : placeable
          .map(
            ({ collection, slug, castle, coords, location }) =>
              `  ${collection}/${slug}\n    location: ${location}\n    castles/${castle} ${point(coords)}`,
          )
          .join("\n"),
  );

  console.log(`\nNO CASTLE MATCH (${unplaceable.length})`);
  console.log(
    unplaceable.length === 0
      ? "  none"
      : unplaceable
          .map(
            ({ collection, slug, location }) =>
              `  ${collection}/${slug}  ${location ?? "(no location)"}`,
          )
          .join("\n"),
  );
}
