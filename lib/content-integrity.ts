import { MAP_BOUNDS, entryCoords, isWithinMapBounds } from "@/lib/map";
import type {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import { dateIntegrityErrors } from "@/lib/date-integrity";

type Collections = {
  battles: Awaited<ReturnType<typeof loadAllBattles>>;
  castles: Awaited<ReturnType<typeof loadAllCastles>>;
  characters: Awaited<ReturnType<typeof loadAllCharacters>>;
  dragons: Awaited<ReturnType<typeof loadAllDragons>>;
  events: Awaited<ReturnType<typeof loadAllEvents>>;
  houses: Awaited<ReturnType<typeof loadAllHouses>>;
  weapons: Awaited<ReturnType<typeof loadAllWeapons>>;
};

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

type ReferenceRule<T> = {
  to: ReferenceTarget;
  read: (frontmatter: T) => Reference[];
};

/**
 * Pairs a field name with the slugs it holds, dropping the absent ones so a
 * rule can read an optional or nullable field without guarding first.
 */
function ref(
  field: string,
  values: ReadonlyArray<string | null | undefined>,
): Reference[] {
  return values.flatMap((value) => (value ? [{ field, value }] : []));
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
      rule
        .read(frontmatter)
        .flatMap(({ field, value }) =>
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
          to: "houses",
          read: (fm) => ref("primary-house", [fm["primary-house"]]),
        },
        {
          to: "houses",
          read: (fm) => ref("also-of-houses", fm["also-of-houses"]),
        },
        { to: "characters", read: (fm) => ref("parents", fm.parents) },
        { to: "characters", read: (fm) => ref("spouses", fm.spouses) },
        { to: "characters", read: (fm) => ref("children", fm.children) },
        { to: "all", read: (fm) => ref("mentions", fm.mentions) },
      ],
    }),
    houses: checkRefs({
      name: "houses",
      entries: collections.houses,
      targets,
      rules: [
        { to: "houses", read: (fm) => ref("liege", [fm.liege]) },
        { to: "houses", read: (fm) => ref("sworn-from", fm["sworn-from"]) },
        { to: "houses", read: (fm) => ref("cadet-houses", fm["cadet-houses"]) },
        {
          to: "weapons",
          read: (fm) => ref("ancestral-weapons", fm["ancestral-weapons"] ?? []),
        },
        {
          to: "characters",
          read: (fm) =>
            ref(
              "heads",
              (fm.heads ?? []).map((head) => head.slug),
            ),
        },
        {
          to: "characters",
          read: (fm) =>
            ref(
              "notable-members",
              (fm["notable-members"] ?? []).map((member) => member.slug),
            ),
        },
        { to: "all", read: (fm) => ref("mentions", fm.mentions) },
      ],
    }),
    castles: checkRefs({
      name: "castles",
      entries: collections.castles,
      targets,
      rules: [
        { to: "houses", read: (fm) => ref("liege-house", [fm["liege-house"]]) },
        { to: "houses", read: (fm) => ref("sworn-houses", fm["sworn-houses"]) },
      ],
    }),
    weapons: checkRefs({
      name: "weapons",
      entries: collections.weapons,
      targets,
      rules: [
        {
          to: "houses",
          read: (fm) =>
            ref("houses", [fm["origin-house"], fm["current-house"]]),
        },
        { to: "characters", read: (fm) => ref("wielders", fm.wielders) },
        { to: "all", read: (fm) => ref("mentions", fm.mentions) },
      ],
    }),
    dragons: checkRefs({
      name: "dragons",
      entries: collections.dragons,
      targets,
      rules: [
        { to: "houses", read: (fm) => ref("house", [fm.house]) },
        { to: "characters", read: (fm) => ref("riders", fm.riders) },
        { to: "all", read: (fm) => ref("mentions", fm.mentions) },
      ],
    }),
    battles: checkRefs({
      name: "battles",
      entries: collections.battles,
      targets,
      rules: [
        { to: "characters", read: (fm) => ref("commanders", fm.commanders) },
        { to: "houses", read: participantHouses },
        { to: "all", read: (fm) => ref("mentions", fm.mentions) },
      ],
    }),
    events: checkRefs({
      name: "events",
      entries: collections.events,
      targets,
      rules: [{ to: "houses", read: participantHouses }],
    }),
  } satisfies Record<CollectionName, string[]>;

  return Object.values(byCollection).flat();
}

/** Shared by battles and events, which both carry sided participants. */
function participantHouses(frontmatter: {
  participants: ReadonlyArray<{ houses: readonly string[] }>;
}): Reference[] {
  return frontmatter.participants.flatMap((participant, index) =>
    ref(`participants[${index}].houses`, participant.houses),
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
