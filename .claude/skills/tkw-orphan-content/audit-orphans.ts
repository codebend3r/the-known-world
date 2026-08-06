/**
 * Reports entries that nothing points at.
 *
 * `lib/content-integrity.ts` walks the reference graph outbound and fails on a
 * reference that resolves to nothing. This walks it inbound and reports the
 * mirror-image defect: an entry that resolves for everybody else but that
 * nobody resolves to. Those still prerender, so they are invisible rather than
 * broken, which is why the build never mentions them.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-orphan-content/audit-orphans.ts
 *   bun .claude/skills/tkw-orphan-content/audit-orphans.ts --collection castles
 *   bun .claude/skills/tkw-orphan-content/audit-orphans.ts --json
 *
 * Read-only. Touches no files.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  loadAllBattles,
  loadAllCastles,
  loadAllCharacters,
  loadAllDragons,
  loadAllEvents,
  loadAllHouses,
  loadAllWeapons,
} from "@/lib/content";
import { buildProseLinkIndex } from "@/lib/prose-links";
import { NAV_ITEMS } from "@/lib/nav";
import {
  reciprocalAsymmetries,
  type ReciprocalAsymmetry,
} from "@/lib/content-integrity";

const COLLECTION_NAMES = [
  "battles",
  "castles",
  "characters",
  "dragons",
  "events",
  "houses",
  "weapons",
] as const;

type CollectionName = (typeof COLLECTION_NAMES)[number];

/** `characters/eddard-stark`, the key every count is bucketed under. */
type EntryKey = string;

/**
 * `mutual` marks a field the app also reads backwards. `weapons.wielders` is
 * declared on the weapon, but `app/characters/[slug]` filters every weapon by
 * `wielders.includes(slug)` and renders the result, so the character page links
 * the weapon and the weapon page links the character. Counting such a field in
 * one direction only reports live, linked entries as orphans.
 */
type Edge = { from: EntryKey; field: string; to: EntryKey; mutual?: boolean };

type Row = {
  key: EntryKey;
  collection: CollectionName;
  slug: string;
  name: string;
  /** Frontmatter slug references other than `mentions`. */
  typed: number;
  /** `mentions` entries naming this slug. These expand prose forms, not links. */
  mentions: number;
  /** Bodies whose prose `remarkProseLinks` would turn into a link here. */
  prose: number;
  /** Named by the fields that carry it, deduplicated, for the report. */
  sources: string[];
};

type Report = {
  totals: Array<{
    collection: CollectionName;
    entries: number;
    orphans: number;
    proseOnly: number;
    mentionsOnly: number;
  }>;
  orphans: Row[];
  proseOnly: Row[];
  mentionsOnly: Row[];
  asymmetries: ReciprocalAsymmetry[];
  unrouted: Array<{ collection: CollectionName; index: boolean; nav: boolean }>;
};

function isCollectionName(value: string): value is CollectionName {
  return COLLECTION_NAMES.some((name) => name === value);
}

function parseArgs(argv: readonly string[]) {
  const collectionFlag = argv.indexOf("--collection");
  const raw = collectionFlag === -1 ? null : (argv[collectionFlag + 1] ?? "");
  return {
    json: argv.includes("--json"),
    collection: raw !== null && isCollectionName(raw) ? raw : null,
  };
}

function keyOf({
  collection,
  slug,
}: {
  collection: CollectionName;
  slug: string;
}): EntryKey {
  return `${collection}/${slug}`;
}

function definedStrings(
  values: ReadonlyArray<string | null | undefined>,
): string[] {
  return values.flatMap((value) => (value ? [value] : []));
}

/**
 * Every typed slug reference in the corpus, resolved to the collection its
 * schema targets. This mirrors the field list `contentIntegrityErrors` walks
 * outbound; adding a slug field to a schema means adding it here too, or the
 * inbound count silently under-reports and a live entry looks orphaned.
 */
function typedEdges(collections: Collections): Edge[] {
  const toChars = (slugs: readonly string[]) =>
    slugs.map((slug) => keyOf({ collection: "characters", slug }));
  const toHouses = (slugs: readonly string[]) =>
    slugs.map((slug) => keyOf({ collection: "houses", slug }));

  // A house page renders its family tree only when it has no `notable-members`
  // list, so `primary-house` reads backwards for tree houses and not for the
  // rest. That asymmetry is why a fully written character can sit behind a
  // curated notable-members list with nothing linking to it.
  const treeHouses = new Set(
    collections.houses
      .filter(
        ({ frontmatter }) =>
          (frontmatter["notable-members"] ?? []).length === 0,
      )
      .map(({ slug }) => keyOf({ collection: "houses", slug })),
  );

  const fromCharacters = collections.characters.flatMap(
    ({ slug, frontmatter }) => {
      const from = keyOf({ collection: "characters", slug });
      return [
        ...toHouses(definedStrings([frontmatter["primary-house"]])).map(
          (to) => ({
            from,
            field: "primary-house",
            to,
            mutual: treeHouses.has(to) && !frontmatter["exclude-from-tree"],
          }),
        ),
        ...toHouses(frontmatter["also-of-houses"]).map((to) => ({
          from,
          field: "also-of-houses",
          to,
        })),
        ...toChars(frontmatter.parents).map((to) => ({
          from,
          field: "parents",
          to,
        })),
        ...toChars(frontmatter.spouses).map((to) => ({
          from,
          field: "spouses",
          to,
        })),
        ...toChars(frontmatter.children).map((to) => ({
          from,
          field: "children",
          to,
        })),
      ];
    },
  );

  const fromHouses = collections.houses.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "houses", slug });
    const seatSlugs = definedStrings([
      frontmatter.seat,
      ...(frontmatter.seats ?? []).map((entry) => entry.slug),
    ]);
    return [
      ...toHouses(definedStrings([frontmatter.liege])).map((to) => ({
        from,
        field: "liege",
        to,
      })),
      ...toHouses(frontmatter["sworn-from"]).map((to) => ({
        from,
        field: "sworn-from",
        to,
      })),
      ...toHouses(frontmatter["cadet-houses"]).map((to) => ({
        from,
        field: "cadet-houses",
        to,
      })),
      ...seatSlugs.map((seat) => ({
        from,
        field: "seat",
        to: keyOf({ collection: "castles", slug: seat }),
      })),
      ...toChars(
        definedStrings((frontmatter.heads ?? []).map((entry) => entry.slug)),
      ).map((to) => ({ from, field: "heads", to })),
      ...toChars(
        definedStrings(
          (frontmatter["notable-members"] ?? []).map((entry) => entry.slug),
        ),
      ).map((to) => ({ from, field: "notable-members", to })),
      ...(frontmatter["ancestral-weapons"] ?? []).map((weapon) => ({
        from,
        field: "ancestral-weapons",
        to: keyOf({ collection: "weapons", slug: weapon }),
      })),
    ];
  });

  const fromCastles = collections.castles.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "castles", slug });
    return [
      ...toHouses(definedStrings([frontmatter["liege-house"]])).map((to) => ({
        from,
        field: "liege-house",
        to,
      })),
      ...toHouses(frontmatter["sworn-houses"]).map((to) => ({
        from,
        field: "sworn-houses",
        to,
      })),
    ];
  });

  const fromWeapons = collections.weapons.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "weapons", slug });
    return [
      ...toHouses(
        definedStrings([
          frontmatter["origin-house"],
          frontmatter["current-house"],
        ]),
      ).map((to) => ({ from, field: "origin/current-house", to })),
      ...toChars(frontmatter.wielders).map((to) => ({
        from,
        field: "wielders",
        to,
        mutual: true,
      })),
    ];
  });

  const fromDragons = collections.dragons.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "dragons", slug });
    return [
      ...toHouses(definedStrings([frontmatter.house])).map((to) => ({
        from,
        field: "house",
        to,
        mutual: true,
      })),
      ...toChars(frontmatter.riders).map((to) => ({
        from,
        field: "riders",
        to,
        mutual: true,
      })),
    ];
  });

  const fromBattles = collections.battles.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "battles", slug });
    return [
      ...toChars(frontmatter.commanders).map((to) => ({
        from,
        field: "commanders",
        to,
      })),
      ...toChars(frontmatter.casualties).map((to) => ({
        from,
        field: "casualties",
        to,
      })),
      ...toHouses(
        frontmatter.participants.flatMap((participant) => participant.houses),
      ).map((to) => ({ from, field: "participants.houses", to })),
    ];
  });

  const fromEvents = collections.events.flatMap(({ slug, frontmatter }) => {
    const from = keyOf({ collection: "events", slug });
    return [
      ...toChars(frontmatter.casualties).map((to) => ({
        from,
        field: "casualties",
        to,
      })),
      ...toHouses(
        frontmatter.participants.flatMap((participant) => participant.houses),
      ).map((to) => ({ from, field: "participants.houses", to })),
      ...(typeof frontmatter.location === "string"
        ? [
            {
              from,
              field: "location",
              to: keyOf({
                collection: "castles",
                slug: frontmatter.location,
              }),
            },
          ]
        : []),
    ];
  });

  return [
    ...fromCharacters,
    ...fromHouses,
    ...fromCastles,
    ...fromWeapons,
    ...fromDragons,
    ...fromBattles,
    ...fromEvents,
  ];
}

/**
 * `mentions` is typed loosely: the schema takes any slug and
 * `contentIntegrityErrors` validates it against every collection at once. So a
 * mention resolves to every entry sharing that slug, which is how the app
 * treats it. 17 slugs are held by two collections at once.
 */
function mentionEdges({
  collections,
  collectionsBySlug,
}: {
  collections: Collections;
  collectionsBySlug: Map<string, CollectionName[]>;
}): Edge[] {
  const sources = [
    ...collections.characters.map((entry) => ({
      from: keyOf({ collection: "characters", slug: entry.slug }),
      mentions: entry.frontmatter.mentions,
    })),
    ...collections.houses.map((entry) => ({
      from: keyOf({ collection: "houses", slug: entry.slug }),
      mentions: entry.frontmatter.mentions,
    })),
    ...collections.weapons.map((entry) => ({
      from: keyOf({ collection: "weapons", slug: entry.slug }),
      mentions: entry.frontmatter.mentions,
    })),
    ...collections.dragons.map((entry) => ({
      from: keyOf({ collection: "dragons", slug: entry.slug }),
      mentions: entry.frontmatter.mentions,
    })),
    ...collections.battles.map((entry) => ({
      from: keyOf({ collection: "battles", slug: entry.slug }),
      mentions: entry.frontmatter.mentions,
    })),
  ];
  return sources.flatMap(({ from, mentions }) =>
    mentions.flatMap((slug) =>
      (collectionsBySlug.get(slug) ?? []).map((collection) => ({
        from,
        field: "mentions",
        to: keyOf({ collection, slug }),
      })),
    ),
  );
}

/**
 * Which bodies `remarkProseLinks` would turn into a link to each target.
 *
 * Only `characters`, `houses`, `weapons` and `dragons` render markdown with a
 * prose-link index; `app/battles`, `app/castles` and `app/events` call
 * `renderMarkdown` with no index, so their bodies emit no links at all and are
 * excluded as sources.
 *
 * The index is built with an empty `mentions` list on purpose. Mentions only
 * widen a target's surface forms (a bare first name, a bare house name), and
 * they can only do so for a slug already listed in that page's `mentions`,
 * which is already counted as a structured reference. So the empty-mentions
 * index is the right base for deciding whether prose is the *only* way in.
 */
function proseEdges(collections: Collections): Edge[] {
  const index = buildProseLinkIndex({
    allCharacters: collections.characters,
    allHouses: collections.houses,
    allWeapons: collections.weapons,
    allDragons: collections.dragons,
    current: { kind: "character", slug: "", mentions: [] },
  });

  const kindToCollection = {
    character: "characters",
    house: "houses",
    weapon: "weapons",
    dragon: "dragons",
  } as const satisfies Record<string, CollectionName>;

  // First form wins, matching `compileIndex` in `lib/prose-links.ts`. Two
  // entries sharing a surface form means the loser never links anywhere.
  const formToKey = index.targets.reduce<Map<string, EntryKey>>(
    (map, target) =>
      target.surfaceForms.reduce(
        (inner, form) =>
          inner.has(form)
            ? inner
            : inner.set(
                form,
                keyOf({
                  collection: kindToCollection[target.kind],
                  slug: target.slug,
                }),
              ),
        map,
      ),
    new Map(),
  );

  const forms = [...formToKey.keys()].sort((a, b) => b.length - a.length);
  if (forms.length === 0) return [];
  const pattern = new RegExp(
    `\\b(${forms.map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "g",
  );

  const linkingBodies = [
    ...collections.characters.map((entry) => ({
      collection: "characters" as const,
      slug: entry.slug,
      body: entry.body,
    })),
    ...collections.houses.map((entry) => ({
      collection: "houses" as const,
      slug: entry.slug,
      body: entry.body,
    })),
    ...collections.weapons.map((entry) => ({
      collection: "weapons" as const,
      slug: entry.slug,
      body: entry.body,
    })),
    ...collections.dragons.map((entry) => ({
      collection: "dragons" as const,
      slug: entry.slug,
      body: entry.body,
    })),
  ];

  return linkingBodies.flatMap(({ collection, slug, body }) => {
    const from = keyOf({ collection, slug });
    const matched = body.match(pattern) ?? [];
    const hit = matched.reduce<Set<EntryKey>>((seen, form) => {
      const to = formToKey.get(form);
      // `compileIndex` drops any target sharing the page's own slug, across
      // collections, because `selfSlug` is a bare slug.
      if (to && !to.endsWith(`/${slug}`)) seen.add(to);
      return seen;
    }, new Set());
    return [...hit].map((to) => ({ from, field: "prose", to }));
  });
}

type Collections = {
  battles: Awaited<ReturnType<typeof loadAllBattles>>;
  castles: Awaited<ReturnType<typeof loadAllCastles>>;
  characters: Awaited<ReturnType<typeof loadAllCharacters>>;
  dragons: Awaited<ReturnType<typeof loadAllDragons>>;
  events: Awaited<ReturnType<typeof loadAllEvents>>;
  houses: Awaited<ReturnType<typeof loadAllHouses>>;
  weapons: Awaited<ReturnType<typeof loadAllWeapons>>;
};

async function routeStatus(collection: CollectionName) {
  const index = await fs
    .access(path.join(process.cwd(), "app", collection, "page.tsx"))
    .then(() => true)
    .catch(() => false);
  const nav = NAV_ITEMS.some(
    (item) => item.href === `/${collection}/` && item.visible,
  );
  return { collection, index, nav };
}

/** Buckets edges under the entry they make reachable, both ways when mutual. */
function countBy(edges: readonly Edge[]): Map<EntryKey, Edge[]> {
  return edges
    .flatMap((edge) =>
      edge.mutual ? [edge, { ...edge, from: edge.to, to: edge.from }] : [edge],
    )
    .reduce<Map<EntryKey, Edge[]>>(
      (map, edge) => map.set(edge.to, [...(map.get(edge.to) ?? []), edge]),
      new Map(),
    );
}

function formatTable(rows: readonly string[][]): string {
  if (rows.length === 0) return "";
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((cells) => (cells[column] ?? "").length)),
  );
  return rows
    .map((cells) =>
      cells
        .map((cell, column) => cell.padEnd(widths[column]))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

const { json, collection: only } = parseArgs(Bun.argv.slice(2));

const [battles, castles, characters, dragons, events, houses, weapons] =
  await Promise.all([
    loadAllBattles(),
    loadAllCastles(),
    loadAllCharacters(),
    loadAllDragons(),
    loadAllEvents(),
    loadAllHouses(),
    loadAllWeapons(),
  ]);

const collections: Collections = {
  battles,
  castles,
  characters,
  dragons,
  events,
  houses,
  weapons,
};

const entries = COLLECTION_NAMES.flatMap((collection) =>
  collections[collection].map((entry) => ({
    collection,
    slug: entry.slug,
    name: entry.frontmatter.name,
    key: keyOf({ collection, slug: entry.slug }),
  })),
);

const collectionsBySlug = entries.reduce<Map<string, CollectionName[]>>(
  (map, entry) =>
    map.set(entry.slug, [...(map.get(entry.slug) ?? []), entry.collection]),
  new Map(),
);

const typed = countBy(
  typedEdges(collections).filter((edge) => edge.from !== edge.to),
);
const mentions = countBy(
  mentionEdges({ collections, collectionsBySlug }).filter(
    (edge) => edge.from !== edge.to,
  ),
);
const prose = countBy(proseEdges(collections));

const rows: Row[] = entries
  .map(({ key, collection, slug, name }) => {
    const typedEdgesIn = typed.get(key) ?? [];
    return {
      key,
      collection,
      slug,
      name,
      typed: typedEdgesIn.length,
      mentions: (mentions.get(key) ?? []).length,
      prose: (prose.get(key) ?? []).length,
      sources: [
        ...new Set(typedEdgesIn.map((edge) => edge.field)),
      ].sort() satisfies string[],
    };
  })
  .filter((row) => only === null || row.collection === only);

const orphans = rows.filter(
  (row) => row.typed + row.mentions + row.prose === 0,
);
const proseOnly = rows.filter((row) => row.typed === 0 && row.prose > 0);
const mentionsOnly = rows.filter(
  (row) => row.typed === 0 && row.prose === 0 && row.mentions > 0,
);

const asymmetries = reciprocalAsymmetries(collections).filter(
  (issue) => only === null || issue.source.startsWith(`${only}/`),
);

const routes = await Promise.all(
  COLLECTION_NAMES.filter((name) => only === null || name === only).map(
    routeStatus,
  ),
);
const unrouted = routes.filter((route) => !route.index || !route.nav);

const totals = COLLECTION_NAMES.filter(
  (name) => only === null || name === only,
).map((collection) => ({
  collection,
  entries: rows.filter((row) => row.collection === collection).length,
  orphans: orphans.filter((row) => row.collection === collection).length,
  proseOnly: proseOnly.filter((row) => row.collection === collection).length,
  mentionsOnly: mentionsOnly.filter((row) => row.collection === collection)
    .length,
}));

const report: Report = {
  totals,
  orphans,
  proseOnly,
  mentionsOnly,
  asymmetries,
  unrouted,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const byKey = (a: Row, b: Row) => a.key.localeCompare(b.key);

  console.log("INBOUND REFERENCES BY COLLECTION\n");
  console.log(
    formatTable([
      ["COLLECTION", "ENTRIES", "ORPHAN", "PROSE-ONLY", "MENTIONS-ONLY"],
      ...totals.map((total) => [
        total.collection,
        String(total.entries),
        String(total.orphans),
        String(total.proseOnly),
        String(total.mentionsOnly),
      ]),
    ]),
  );

  console.log(`\n\nORPHANS (${orphans.length}) nothing points here at all\n`);
  console.log(
    orphans.length === 0
      ? "  none"
      : formatTable(
          [...orphans].sort(byKey).map((row) => [`  ${row.key}`, row.name]),
        ),
  );

  console.log(
    `\n\nPROSE-ONLY (${proseOnly.length}) reachable only by name matching\n`,
  );
  console.log(
    proseOnly.length === 0
      ? "  none"
      : formatTable([
          ["  KEY", "PROSE", "NAME"],
          ...[...proseOnly]
            .sort((a, b) => a.prose - b.prose || byKey(a, b))
            .map((row) => [`  ${row.key}`, String(row.prose), row.name]),
        ]),
  );

  console.log(
    `\n\nMENTIONS-ONLY (${mentionsOnly.length}) declared in mentions, but no body names them, so no link renders\n`,
  );
  console.log(
    mentionsOnly.length === 0
      ? "  none"
      : formatTable(
          [...mentionsOnly]
            .sort(byKey)
            .map((row) => [`  ${row.key}`, row.name]),
        ),
  );

  console.log(
    `\n\nRECIPROCAL ASYMMETRIES (${asymmetries.length}) A names B, B omits A\n`,
  );
  console.log(
    asymmetries.length === 0
      ? "  none"
      : formatTable(
          asymmetries.map((issue) => [
            `  ${issue.source}.${issue.field}`,
            `-> ${issue.target}`,
            `${issue.expected} omits it`,
          ]),
        ),
  );

  console.log(`\n\nCOLLECTION REACHABILITY (${unrouted.length} incomplete)\n`);
  console.log(
    unrouted.length === 0
      ? "  none"
      : formatTable(
          unrouted.map((route) => [
            `  ${route.collection}`,
            route.index ? "has /index" : "NO /index route",
            route.nav ? "in nav" : "NOT in nav",
          ]),
        ),
  );
}
