import { MAP_BOUNDS, entryCoords, isWithinMapBounds } from "@/lib/map";
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

export function contentIntegrityErrors(collections: Collections): string[] {
  const slugSets = buildSlugSets(collections);
  const allEntitySlugs = new Set(
    Object.values(slugSets).flatMap((slugs) => [...slugs]),
  );
  const errors = Object.entries(collections).flatMap(([name, entries]) => {
    const duplicateErrors = duplicateSlugErrors({ name, entries });
    const filenameErrors = entries.flatMap((entry) =>
      entry.slug === entry.frontmatter.slug
        ? []
        : [
            `${name}/${entry.slug}: frontmatter slug is ${entry.frontmatter.slug}`,
          ],
    );
    return [...duplicateErrors, ...filenameErrors];
  });

  const addReference = ({
    source,
    field,
    values,
    targets,
  }: {
    source: string;
    field: string;
    values: ReadonlyArray<string | null | undefined>;
    targets: ReadonlySet<string>;
  }) => {
    values.forEach((value) => {
      if (value && !targets.has(value)) {
        errors.push(`${source}.${field}: missing ${value}`);
      }
    });
  };

  collections.characters.forEach(({ slug, frontmatter }) => {
    const source = `characters/${slug}`;
    addReference({
      source,
      field: "primary-house",
      values: [frontmatter["primary-house"]],
      targets: slugSets.houses,
    });
    addReference({
      source,
      field: "also-of-houses",
      values: frontmatter["also-of-houses"],
      targets: slugSets.houses,
    });
    const characterReferences = {
      parents: frontmatter.parents,
      spouses: frontmatter.spouses,
      children: frontmatter.children,
    };
    Object.entries(characterReferences).forEach(([field, values]) => {
      addReference({
        source,
        field,
        values,
        targets: slugSets.characters,
      });
    });
    addReference({
      source,
      field: "mentions",
      values: frontmatter.mentions,
      targets: allEntitySlugs,
    });
  });

  collections.houses.forEach(({ slug, frontmatter }) => {
    const source = `houses/${slug}`;
    const houseReferences = {
      liege: [frontmatter.liege],
      "sworn-from": frontmatter["sworn-from"],
      "cadet-houses": frontmatter["cadet-houses"],
    };
    Object.entries(houseReferences).forEach(([field, values]) => {
      addReference({
        source,
        field,
        values,
        targets: slugSets.houses,
      });
    });
    addReference({
      source,
      field: "ancestral-weapons",
      values: frontmatter["ancestral-weapons"] ?? [],
      targets: slugSets.weapons,
    });
    const memberReferences = {
      heads: frontmatter.heads ?? [],
      "notable-members": frontmatter["notable-members"] ?? [],
    };
    Object.entries(memberReferences).forEach(([field, entries]) => {
      addReference({
        source,
        field,
        values: entries.map((entry) => entry.slug),
        targets: slugSets.characters,
      });
    });
    addReference({
      source,
      field: "mentions",
      values: frontmatter.mentions,
      targets: allEntitySlugs,
    });
  });

  // Atlas-space bounds. Nothing in the build fails when a marker is dragged
  // off the map, so the marker just stops rendering somewhere nobody looks.
  const placementSources = [
    { name: "castles", entries: collections.castles },
    { name: "battles", entries: collections.battles },
    { name: "events", entries: collections.events },
  ];
  placementSources.forEach(({ name, entries }) => {
    entries.forEach(({ slug, frontmatter }) => {
      const coords = entryCoords(frontmatter);
      if (!coords || isWithinMapBounds(coords)) return;
      errors.push(
        `${name}/${slug}.coords: (${coords.x}, ${coords.y}) is outside the ${MAP_BOUNDS.width}x${MAP_BOUNDS.height} map`,
      );
    });
  });

  collections.castles.forEach(({ slug, frontmatter }) => {
    const source = `castles/${slug}`;
    addReference({
      source,
      field: "liege-house",
      values: [frontmatter["liege-house"]],
      targets: slugSets.houses,
    });
    addReference({
      source,
      field: "sworn-houses",
      values: frontmatter["sworn-houses"],
      targets: slugSets.houses,
    });
  });

  collections.weapons.forEach(({ slug, frontmatter }) => {
    const source = `weapons/${slug}`;
    addReference({
      source,
      field: "houses",
      values: [frontmatter["origin-house"], frontmatter["current-house"]],
      targets: slugSets.houses,
    });
    addReference({
      source,
      field: "wielders",
      values: frontmatter.wielders,
      targets: slugSets.characters,
    });
    addReference({
      source,
      field: "mentions",
      values: frontmatter.mentions,
      targets: allEntitySlugs,
    });
  });

  collections.dragons.forEach(({ slug, frontmatter }) => {
    const source = `dragons/${slug}`;
    addReference({
      source,
      field: "house",
      values: [frontmatter.house],
      targets: slugSets.houses,
    });
    addReference({
      source,
      field: "riders",
      values: frontmatter.riders,
      targets: slugSets.characters,
    });
    addReference({
      source,
      field: "mentions",
      values: frontmatter.mentions,
      targets: allEntitySlugs,
    });
  });

  [...collections.battles, ...collections.events].forEach(
    ({ slug, frontmatter }) => {
      const source = `${"commanders" in frontmatter ? "battles" : "events"}/${slug}`;
      if ("commanders" in frontmatter) {
        addReference({
          source,
          field: "commanders",
          values: frontmatter.commanders,
          targets: slugSets.characters,
        });
      }
      frontmatter.participants.forEach((participant, index) => {
        addReference({
          source,
          field: `participants[${index}].houses`,
          values: participant.houses,
          targets: slugSets.houses,
        });
      });
    },
  );

  reciprocalAsymmetries(collections).forEach((issue) => {
    errors.push(
      `${issue.source}.${issue.field}: ${issue.target} does not name it back in ${issue.expected}`,
    );
  });

  return [...errors, ...dateIntegrityErrors(collections)];
}

function buildSlugSets(collections: Collections) {
  return {
    battles: new Set(
      collections.battles.map((entry) => entry.frontmatter.slug),
    ),
    castles: new Set(
      collections.castles.map((entry) => entry.frontmatter.slug),
    ),
    characters: new Set(
      collections.characters.map((entry) => entry.frontmatter.slug),
    ),
    dragons: new Set(
      collections.dragons.map((entry) => entry.frontmatter.slug),
    ),
    events: new Set(collections.events.map((entry) => entry.frontmatter.slug)),
    houses: new Set(collections.houses.map((entry) => entry.frontmatter.slug)),
    weapons: new Set(
      collections.weapons.map((entry) => entry.frontmatter.slug),
    ),
  } satisfies Record<CollectionName, Set<string>>;
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
