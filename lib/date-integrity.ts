import { absoluteYear } from "@/lib/battle-date";
import type { Collections } from "@/lib/content";
import type { CalendarDate } from "@/lib/schemas";

/** The date checks read every collection, so this is just `Collections`. */
export type DateCollections = Collections;

export type DateCollectionName = keyof DateCollections;

export const DATE_DEFECT_CLASSES = [
  "sign",
  "era-range",
  "ordering",
  "lifespan",
  "lineage",
  "status",
  "precision",
] as const;

export type DateDefectClass = (typeof DATE_DEFECT_CLASSES)[number];

export type DateDefect = {
  defect: DateDefectClass;
  collection: DateCollectionName;
  slug: string;
  field: string;
  detail: string;
};

/**
 * Plausible span of each era on the single signed axis `absoluteYear` builds
 * (negative before Aegon's landing, positive after). A date whose era does not
 * contain its year renders in the wrong band and sorts against the wrong
 * neighbours.
 *
 * These are validity ranges, deliberately wider than the `ERA_BANDS` strips in
 * `lib/timeline.ts`. Those strips are labels drawn beside the ancient stretch
 * of the chart; these bounds are what the corpus is allowed to claim. The
 * ranges overlap on purpose: the Age of Heroes runs on through the Andal
 * invasion, so a year inside both is a judgement call, not an error.
 */
export const ERA_YEAR_BOUNDS: Record<
  CalendarDate["era"],
  { from: number; to: number }
> = {
  "dawn-age": { from: -12000, to: -10000 },
  "age-of-heroes": { from: -10000, to: -2000 },
  "long-night": { from: -8100, to: -7600 },
  "andal-invasion": { from: -6000, to: -1000 },
  "targaryen-conquest": { from: -3, to: 3 },
  "roberts-reign": { from: 283, to: 298 },
  "game-of-thrones": { from: 298, to: 305 },
  BC: { from: -12000, to: -1 },
  AC: { from: 1, to: 320 },
};

/**
 * How far either side of its stated year a date may really sit. Year-level
 * claims get no slack, so ordering and lineage checks bite; era and legendary
 * claims are band markers rather than years, so they only trip on gross
 * inversions.
 */
export const PRECISION_SLACK_YEARS: Record<CalendarDate["precision"], number> =
  {
    exact: 0,
    year: 0,
    decade: 5,
    era: 500,
    legendary: 1000,
  };

/** Maester Aemon died at 102, the oldest age the corpus records. */
export const MAX_LIFESPAN_YEARS = 110;
/** Youngest plausible age at which a character fathers or bears a child. */
export const MIN_PARENT_AGE_YEARS = 12;
/** A child may be born posthumously, but not a year and more after. */
export const MAX_POSTHUMOUS_YEARS = 1;

type DatedField = {
  collection: DateCollectionName;
  slug: string;
  field: string;
  date: CalendarDate;
  sourceCount: number;
};

function slack(date: CalendarDate): number {
  return PRECISION_SLACK_YEARS[date.precision];
}

/** True when the date names a single year rather than an era-wide band. */
function isYearClaim(date: CalendarDate): boolean {
  return date.precision === "exact" || date.precision === "year";
}

/** Mirrors the gate in `lib/age.ts`: only these dates yield a printed age. */
function yieldsAge(date: CalendarDate): boolean {
  return (date.era === "AC" || date.era === "BC") && isYearClaim(date);
}

function describe(date: CalendarDate): string {
  return `${date.year} ${date.era} (${date.precision})`;
}

function datedFields(collections: DateCollections): DatedField[] {
  const pick = ({
    collection,
    slug,
    sourceCount,
    fields,
  }: {
    collection: DateCollectionName;
    slug: string;
    sourceCount: number;
    fields: ReadonlyArray<[string, CalendarDate | null | undefined]>;
  }): DatedField[] =>
    fields.flatMap(([field, date]) =>
      date ? [{ collection, slug, field, date, sourceCount }] : [],
    );

  return [
    ...collections.characters.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "characters",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [
          ["born", frontmatter.born],
          ["died", frontmatter.died],
        ],
      }),
    ),
    ...collections.castles.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "castles",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [["founded", frontmatter.founded]],
      }),
    ),
    ...collections.houses.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "houses",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [
          ["founded", frontmatter.founded],
          ["extinct", frontmatter.extinct],
        ],
      }),
    ),
    ...collections.weapons.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "weapons",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [
          ["forged", frontmatter.forged],
          ["destroyed", frontmatter.destroyed],
        ],
      }),
    ),
    ...collections.dragons.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "dragons",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [
          ["hatched", frontmatter.hatched],
          ["died", frontmatter.died],
        ],
      }),
    ),
    ...collections.events.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "events",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [["date", frontmatter.date]],
      }),
    ),
    ...collections.battles.flatMap(({ slug, frontmatter }) =>
      pick({
        collection: "battles",
        slug,
        sourceCount: frontmatter.sources.length,
        fields: [
          ["start", frontmatter.start],
          ["end", frontmatter.end],
        ],
      }),
    ),
  ];
}

/**
 * Sign and range checks on a single date.
 *
 * `absoluteYear` reads `AC` and `BC` as magnitudes and every named era as an
 * already-signed year, so a negative `BC` year lands on the far side of the
 * Conquest while `formatEraDate` keeps printing the right label. That is why
 * the sign check runs first and suppresses the range check: one mistake, one
 * finding.
 */
function fieldDefects(field: DatedField): DateDefect[] {
  const { collection, slug, date, sourceCount } = field;
  const at = { defect: "sign" as const, collection, slug, field: field.field };

  const precisionDefects: DateDefect[] =
    date.precision === "exact" && sourceCount === 0
      ? [
          {
            ...at,
            defect: "precision",
            detail: `precision "exact" on an entry that cites no sources; the corpus can only support "year"`,
          },
        ]
      : [];

  if ((date.era === "AC" || date.era === "BC") && date.year <= 0) {
    return [
      {
        ...at,
        detail: `${describe(date)} stores a non-positive year; ${date.era} years are positive magnitudes, and absoluteYear() puts this at ${absoluteYear(date)}`,
      },
      ...precisionDefects,
    ];
  }

  const bounds = ERA_YEAR_BOUNDS[date.era];
  const year = absoluteYear(date);
  if (year < bounds.from || year > bounds.to) {
    return [
      {
        ...at,
        defect: "era-range",
        detail: `${describe(date)} sits at ${year} on the axis, outside ${date.era} (${bounds.from} to ${bounds.to})`,
      },
      ...precisionDefects,
    ];
  }

  return precisionDefects;
}

function orderingDefect({
  collection,
  slug,
  earlierField,
  earlier,
  laterField,
  later,
}: {
  collection: DateCollectionName;
  slug: string;
  earlierField: string;
  earlier: CalendarDate | null | undefined;
  laterField: string;
  later: CalendarDate | null | undefined;
}): DateDefect[] {
  if (!earlier || !later) return [];
  const tolerance = slack(earlier) + slack(later);
  const gap = absoluteYear(later) - absoluteYear(earlier);
  if (gap >= -tolerance) return [];
  return [
    {
      defect: "ordering",
      collection,
      slug,
      field: laterField,
      detail: `${laterField} ${describe(later)} falls ${-gap} years before ${earlierField} ${describe(earlier)}`,
    },
  ];
}

function orderingDefects(collections: DateCollections): DateDefect[] {
  return [
    ...collections.characters.flatMap(({ slug, frontmatter }) =>
      orderingDefect({
        collection: "characters",
        slug,
        earlierField: "born",
        earlier: frontmatter.born,
        laterField: "died",
        later: frontmatter.died,
      }),
    ),
    ...collections.houses.flatMap(({ slug, frontmatter }) =>
      orderingDefect({
        collection: "houses",
        slug,
        earlierField: "founded",
        earlier: frontmatter.founded,
        laterField: "extinct",
        later: frontmatter.extinct,
      }),
    ),
    ...collections.weapons.flatMap(({ slug, frontmatter }) =>
      orderingDefect({
        collection: "weapons",
        slug,
        earlierField: "forged",
        earlier: frontmatter.forged,
        laterField: "destroyed",
        later: frontmatter.destroyed,
      }),
    ),
    ...collections.dragons.flatMap(({ slug, frontmatter }) =>
      orderingDefect({
        collection: "dragons",
        slug,
        earlierField: "hatched",
        earlier: frontmatter.hatched,
        laterField: "died",
        later: frontmatter.died,
      }),
    ),
    ...collections.battles.flatMap(({ slug, frontmatter }) =>
      orderingDefect({
        collection: "battles",
        slug,
        earlierField: "start",
        earlier: frontmatter.start,
        laterField: "end",
        later: frontmatter.end,
      }),
    ),
  ];
}

/**
 * Guards the number `ageAtDeath` prints on a character page, so the gate here
 * is the gate there: both dates on the AC/BC axis, both naming a year.
 */
function lifespanDefects(collections: DateCollections): DateDefect[] {
  return collections.characters.flatMap(({ slug, frontmatter }) => {
    const { born, died } = frontmatter;
    if (!born || !died) return [];
    if (!yieldsAge(born) || !yieldsAge(died)) return [];
    const age = absoluteYear(died) - absoluteYear(born);
    if (age <= MAX_LIFESPAN_YEARS) return [];
    return [
      {
        defect: "lifespan" as const,
        collection: "characters" as const,
        slug,
        field: "died",
        detail: `lifespan of ${age} years from ${describe(born)} to ${describe(died)} exceeds the ${MAX_LIFESPAN_YEARS} year bound`,
      },
    ];
  });
}

function lineageDefects(collections: DateCollections): DateDefect[] {
  const bySlug = new Map(
    collections.characters.map(({ frontmatter }) => [
      frontmatter.slug,
      frontmatter,
    ]),
  );

  return collections.characters.flatMap(({ slug, frontmatter }) => {
    const born = frontmatter.born;
    if (!born) return [];
    return frontmatter.parents.flatMap((parentSlug) => {
      const parent = bySlug.get(parentSlug);
      if (!parent) return [];
      const tooYoung = (parent.born ? [parent.born] : []).flatMap(
        (parentBorn) => {
          const tolerance = slack(born) + slack(parentBorn);
          const gap = absoluteYear(born) - absoluteYear(parentBorn);
          if (gap >= MIN_PARENT_AGE_YEARS - tolerance) return [];
          return [
            {
              defect: "lineage" as const,
              collection: "characters" as const,
              slug,
              field: "born",
              detail: `born ${describe(born)}, only ${gap} years after parent ${parentSlug} ${describe(parentBorn)}`,
            },
          ];
        },
      );
      const posthumous = (parent.died ? [parent.died] : []).flatMap(
        (parentDied) => {
          const tolerance = slack(born) + slack(parentDied);
          const gap = absoluteYear(born) - absoluteYear(parentDied);
          if (gap <= MAX_POSTHUMOUS_YEARS + tolerance) return [];
          return [
            {
              defect: "lineage" as const,
              collection: "characters" as const,
              slug,
              field: "born",
              detail: `born ${describe(born)}, ${gap} years after parent ${parentSlug} died ${describe(parentDied)}`,
            },
          ];
        },
      );
      return [...tooYoung, ...posthumous];
    });
  });
}

/** A terminal date on an entry whose status says it never ended. */
function statusDefects(collections: DateCollections): DateDefect[] {
  return [
    ...collections.weapons.flatMap(({ slug, frontmatter }) =>
      frontmatter.destroyed && frontmatter.status !== "destroyed"
        ? [
            {
              defect: "status" as const,
              collection: "weapons" as const,
              slug,
              field: "destroyed",
              detail: `destroyed ${describe(frontmatter.destroyed)} but status is "${frontmatter.status}"`,
            },
          ]
        : [],
    ),
    ...collections.dragons.flatMap(({ slug, frontmatter }) =>
      frontmatter.died && frontmatter.status !== "dead"
        ? [
            {
              defect: "status" as const,
              collection: "dragons" as const,
              slug,
              field: "died",
              detail: `died ${describe(frontmatter.died)} but status is "${frontmatter.status}"`,
            },
          ]
        : [],
    ),
    ...collections.houses.flatMap(({ slug, frontmatter }) =>
      frontmatter.extinct && frontmatter.status !== "extinct"
        ? [
            {
              defect: "status" as const,
              collection: "houses" as const,
              slug,
              field: "extinct",
              detail: `extinct ${describe(frontmatter.extinct)} but status is "${frontmatter.status}"`,
            },
          ]
        : [],
    ),
  ];
}

/** Every mechanically detectable date defect in the corpus. */
export function dateIntegrityDefects(
  collections: DateCollections,
): DateDefect[] {
  return [
    ...datedFields(collections).flatMap(fieldDefects),
    ...orderingDefects(collections),
    ...lifespanDefects(collections),
    ...lineageDefects(collections),
    ...statusDefects(collections),
  ];
}

/** The same findings as one string per defect, for `contentIntegrityErrors`. */
export function dateIntegrityErrors(collections: DateCollections): string[] {
  return dateIntegrityDefects(collections).map(
    ({ collection, slug, field, defect, detail }) =>
      `${collection}/${slug}.${field}: [${defect}] ${detail}`,
  );
}
