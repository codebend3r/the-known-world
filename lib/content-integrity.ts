import {
  MAP_BOUNDS,
  WORLD_MAP_MARKER_RADIUS,
  WORLD_MAP_RASTER,
  doWorldMapHotspotsOverlap,
  entryCoords,
  isWithinMapBounds,
  isWithinWorldMapRaster,
} from "@/lib/map";
import type { Collections } from "@/lib/content";
import { dateIntegrityErrors } from "@/lib/date-integrity";

type CollectionName = keyof Collections;

/**
 * One half of a two-way relationship that only one side declares.
 *
 * `source.field` names `target`, but `target.expected` does not name back. The
 * entry is still valid, so no outbound check catches it; the cost is that the
 * relationship renders on one page and not the other, which is how an entry
 * ends up with nothing pointing at it.
 */
export type ReciprocalAsymmetry = {
  /** `characters/hoster-tully` */
  source: string;
  /** The field on the source that declares the relationship. */
  field: string;
  /** `characters/catelyn-stark` */
  target: string;
  /** The field on the target that should name the source and does not. */
  expected: string;
};

/**
 * Character kinship is the only genuinely symmetric relation in the corpus, so
 * it is the only one checked here.
 *
 * `houses.seat` and `castles.liege-house` look reciprocal and are not: five
 * extinct houses list `harrenhal` as their seat while the castle names one
 * current holder, which is the correct reading of both fields. Likewise
 * `houses.ancestral-weapons` is a curated subset of the weapons whose
 * `current-house` names that house, not its inverse. Neither belongs here.
 */
export function reciprocalAsymmetries({
  characters,
}: Pick<Collections, "characters">): ReciprocalAsymmetry[] {
  const bySlug = new Map(
    characters.map((entry) => [entry.frontmatter.slug, entry.frontmatter]),
  );
  const rules = [
    { field: "parents", expected: "children" },
    { field: "children", expected: "parents" },
    { field: "spouses", expected: "spouses" },
  ] as const;

  return characters.flatMap(({ frontmatter }) =>
    rules.flatMap(({ field, expected }) =>
      frontmatter[field].flatMap((targetSlug) => {
        const target = bySlug.get(targetSlug);
        // A slug resolving to nothing is already an outbound error; reporting
        // it twice would double the noise for one edit.
        if (!target || target[expected].includes(frontmatter.slug)) return [];
        return [
          {
            source: `characters/${frontmatter.slug}`,
            field,
            target: `characters/${targetSlug}`,
            expected,
          },
        ];
      }),
    ),
  );
}

/** One slug named by an entry, and the field that named it. */
type Reference = { field: string; value: string };

/** Where a reference must resolve: a named collection, or any entry at all. */
type ReferenceTarget = CollectionName | "all";

/**
 * Most rules read one field; `custom` is for fields whose name varies per
 * value, such as `participants[0].houses`.
 */
type ReferenceRule<T> =
  | {
      kind: "field";
      to: ReferenceTarget;
      field: string;
      values: (frontmatter: T) => ReadonlyArray<string | null | undefined>;
    }
  | {
      kind: "custom";
      to: ReferenceTarget;
      read: (frontmatter: T) => Reference[];
    };

/**
 * Pairs a field name with the slugs it holds, dropping the absent ones so a
 * rule can read an optional or nullable field without guarding first.
 */
function ref({
  field,
  values,
}: {
  field: string;
  values: ReadonlyArray<string | null | undefined>;
}): Reference[] {
  return values.flatMap((value) => (value ? [{ field, value }] : []));
}

function readRule<T>({
  rule,
  frontmatter,
}: {
  rule: ReferenceRule<T>;
  frontmatter: T;
}): Reference[] {
  switch (rule.kind) {
    case "field":
      return ref({ field: rule.field, values: rule.values(frontmatter) });
    case "custom":
      return rule.read(frontmatter);
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }
}

function checkRefs<T>({
  name,
  entries,
  rules,
  targets,
}: {
  name: CollectionName;
  entries: ReadonlyArray<{ slug: string; frontmatter: T }>;
  rules: ReadonlyArray<ReferenceRule<T>>;
  targets: Record<ReferenceTarget, ReadonlySet<string>>;
}): string[] {
  return entries.flatMap(({ slug, frontmatter }) =>
    rules.flatMap((rule) =>
      readRule({ rule, frontmatter }).flatMap(({ field, value }) =>
        targets[rule.to].has(value)
          ? []
          : [`${name}/${slug}.${field}: missing ${value}`],
      ),
    ),
  );
}

/**
 * Every cross-entry reference in the corpus, as data.
 *
 * Each rule says which field is read and which collection it must resolve
 * into. Keeping them in one table is what makes a gap visible: `battles`
 * carried a `mentions` field that no check ever read, because the outbound
 * checks were written out by hand per collection and that one was missed.
 */
function referenceErrors(collections: Collections): string[] {
  const slugSets = buildSlugSets(collections);
  const targets = {
    ...slugSets,
    all: new Set(Object.values(slugSets).flatMap((slugs) => [...slugs])),
  };

  const byCollection = {
    characters: checkRefs({
      name: "characters",
      entries: collections.characters,
      targets,
      rules: [
        {
          kind: "field",
          to: "houses",
          field: "primary-house",
          values: (fm) => [fm["primary-house"]],
        },
        {
          kind: "field",
          to: "houses",
          field: "also-of-houses",
          values: (fm) => fm["also-of-houses"],
        },
        {
          kind: "field",
          to: "characters",
          field: "parents",
          values: (fm) => fm.parents,
        },
        {
          kind: "field",
          to: "characters",
          field: "spouses",
          values: (fm) => fm.spouses,
        },
        {
          kind: "field",
          to: "characters",
          field: "children",
          values: (fm) => fm.children,
        },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
    houses: checkRefs({
      name: "houses",
      entries: collections.houses,
      targets,
      rules: [
        {
          kind: "field",
          to: "houses",
          field: "liege",
          values: (fm) => [fm.liege],
        },
        {
          kind: "field",
          to: "houses",
          field: "sworn-from",
          values: (fm) => fm["sworn-from"],
        },
        {
          kind: "field",
          to: "houses",
          field: "cadet-houses",
          values: (fm) => fm["cadet-houses"],
        },
        {
          kind: "field",
          to: "weapons",
          field: "ancestral-weapons",
          values: (fm) => fm["ancestral-weapons"] ?? [],
        },
        {
          kind: "field",
          to: "characters",
          field: "heads",
          values: (fm) => (fm.heads ?? []).map((head) => head.slug),
        },
        {
          kind: "field",
          to: "characters",
          field: "notable-members",
          values: (fm) =>
            (fm["notable-members"] ?? []).map((member) => member.slug),
        },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
    castles: checkRefs({
      name: "castles",
      entries: collections.castles,
      targets,
      rules: [
        {
          kind: "field",
          to: "houses",
          field: "liege-house",
          values: (fm) => [fm["liege-house"]],
        },
        {
          kind: "field",
          to: "houses",
          field: "sworn-houses",
          values: (fm) => fm["sworn-houses"],
        },
      ],
    }),
    weapons: checkRefs({
      name: "weapons",
      entries: collections.weapons,
      targets,
      rules: [
        {
          kind: "field",
          to: "houses",
          field: "houses",
          values: (fm) => [fm["origin-house"], fm["current-house"]],
        },
        {
          kind: "field",
          to: "characters",
          field: "wielders",
          values: (fm) => fm.wielders,
        },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
    dragons: checkRefs({
      name: "dragons",
      entries: collections.dragons,
      targets,
      rules: [
        {
          kind: "field",
          to: "houses",
          field: "house",
          values: (fm) => [fm.house],
        },
        {
          kind: "field",
          to: "characters",
          field: "riders",
          values: (fm) => fm.riders,
        },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
    battles: checkRefs({
      name: "battles",
      entries: collections.battles,
      targets,
      rules: [
        {
          kind: "field",
          to: "characters",
          field: "commanders",
          values: (fm) => fm.commanders,
        },
        {
          kind: "field",
          to: "characters",
          field: "casualties",
          values: (fm) => fm.casualties,
        },
        { kind: "custom", to: "houses", read: participantHouses },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
    events: checkRefs({
      name: "events",
      entries: collections.events,
      targets,
      rules: [
        {
          kind: "field",
          to: "characters",
          field: "casualties",
          values: (fm) => fm.casualties,
        },
        { kind: "custom", to: "houses", read: participantHouses },
        {
          kind: "field",
          to: "all",
          field: "mentions",
          values: (fm) => fm.mentions,
        },
      ],
    }),
  } satisfies Record<CollectionName, string[]>;

  return Object.values(byCollection).flat();
}

/** Shared by battles and events, which both carry sided participants. */
function participantHouses(frontmatter: {
  participants: ReadonlyArray<{ houses: readonly string[] }>;
}): Reference[] {
  return frontmatter.participants.flatMap((participant, index) =>
    ref({ field: `participants[${index}].houses`, values: participant.houses }),
  );
}

function slugErrors(collections: Collections): string[] {
  return Object.entries(collections).flatMap(([name, entries]) => [
    ...duplicateSlugErrors({ name, entries }),
    ...entries.flatMap((entry) =>
      entry.slug === entry.frontmatter.slug
        ? []
        : [
            `${name}/${entry.slug}: frontmatter slug is ${entry.frontmatter.slug}`,
          ],
    ),
  ]);
}

/**
 * Atlas-space bounds. Nothing in the build fails when a marker is dragged off
 * the map, so the marker just stops rendering somewhere nobody looks.
 */
function placementErrors(collections: Collections): string[] {
  const placed = [
    { name: "castles", entries: collections.castles },
    { name: "battles", entries: collections.battles },
    { name: "events", entries: collections.events },
  ];
  return placed.flatMap(({ name, entries }) =>
    entries.flatMap(({ slug, frontmatter }) => {
      const coords = entryCoords(frontmatter);
      if (!coords || isWithinMapBounds(coords)) return [];
      return [
        `${name}/${slug}.coords: (${coords.x}, ${coords.y}) is outside the ${MAP_BOUNDS.width}x${MAP_BOUNDS.height} map`,
      ];
    }),
  );
}

/**
 * The `/maps` hotspots. Same failure mode as the atlas: an off-raster pixel
 * draws nothing, and an overlapping pair quietly steals clicks from one seat.
 */
function worldMapErrors(collections: Collections): string[] {
  const pins = collections.castles.flatMap(({ slug, frontmatter }) => {
    const pixel = frontmatter["world-map"];
    return pixel ? [{ slug, pixel }] : [];
  });
  const offRaster = pins
    .filter(({ pixel }) => !isWithinWorldMapRaster(pixel))
    .map(
      ({ slug, pixel }) =>
        `castles/${slug}.world-map: (${pixel.x}, ${pixel.y}) is outside the ${WORLD_MAP_RASTER.width}x${WORLD_MAP_RASTER.height} raster`,
    );
  const overlapping = pins.flatMap((a, index) =>
    pins
      .slice(index + 1)
      .filter((b) => doWorldMapHotspotsOverlap({ a: a.pixel, b: b.pixel }))
      .map(
        (b) =>
          `castles/${a.slug}.world-map: hotspot overlaps castles/${b.slug} (under ${2 * WORLD_MAP_MARKER_RADIUS} natural pixels apart)`,
      ),
  );
  return [...offRaster, ...overlapping];
}

function asymmetryErrors(collections: Collections): string[] {
  return reciprocalAsymmetries(collections).map(
    (issue) =>
      `${issue.source}.${issue.field}: ${issue.target} does not name it back in ${issue.expected}`,
  );
}

export function contentIntegrityErrors(collections: Collections): string[] {
  return [
    ...slugErrors(collections),
    ...referenceErrors(collections),
    ...placementErrors(collections),
    ...worldMapErrors(collections),
    ...asymmetryErrors(collections),
    ...dateIntegrityErrors(collections),
  ];
}

function buildSlugSets(
  collections: Collections,
): Record<CollectionName, ReadonlySet<string>> {
  const slugsOf = (
    entries: ReadonlyArray<{ frontmatter: { slug: string } }>,
  ): ReadonlySet<string> =>
    new Set(entries.map((entry) => entry.frontmatter.slug));
  return {
    battles: slugsOf(collections.battles),
    castles: slugsOf(collections.castles),
    characters: slugsOf(collections.characters),
    dragons: slugsOf(collections.dragons),
    events: slugsOf(collections.events),
    houses: slugsOf(collections.houses),
    weapons: slugsOf(collections.weapons),
  } satisfies Record<CollectionName, ReadonlySet<string>>;
}

function duplicateSlugErrors({
  name,
  entries,
}: {
  name: string;
  entries: ReadonlyArray<{ frontmatter: { slug: string } }>;
}): string[] {
  const counts = entries.reduce<Map<string, number>>((result, entry) => {
    const slug = entry.frontmatter.slug;
    result.set(slug, (result.get(slug) ?? 0) + 1);
    return result;
  }, new Map());
  return [...counts.entries()].flatMap(([slug, count]) =>
    count > 1 ? [`${name}: duplicate slug ${slug}`] : [],
  );
}
