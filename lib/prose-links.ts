import type { Plugin } from "unified";
import type { Root, Text, Link, Parent } from "mdast";
import { visitParents, SKIP } from "unist-util-visit-parents";
import type {
  Battle,
  Castle,
  Character,
  Dragon,
  Event,
  House,
  Weapon,
} from "@/lib/schemas";
import { firstByKey } from "@/lib/collections";

export type ProseLinkKind =
  | "character"
  | "house"
  | "weapon"
  | "dragon"
  | "castle"
  | "battle"
  | "event";

export type ProseLinkTarget = {
  slug: string;
  kind: ProseLinkKind;
  href: string;
  surfaceForms: string[];
};

export type ProseLinkIndex = {
  targets: ProseLinkTarget[];
  self: { kind: ProseLinkKind; slug: string } | null;
};

const KIND_PATH = {
  character: "characters",
  house: "houses",
  weapon: "weapons",
  dragon: "dragons",
  castle: "castles",
  battle: "battles",
  event: "events",
} as const satisfies Record<ProseLinkKind, string>;

const HOUSE_PREFIX = /^House\s+/i;
const ARTICLE_PREFIX = /^The\s+/;
const SKIP_ANCESTOR_TYPES = new Set([
  "link",
  "linkReference",
  "code",
  "inlineCode",
  "heading",
]);

function firstNameToken(name: string): string {
  const trimmed = name.trim();
  const idx = trimmed.search(/\s/);
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

function shortHouseName(name: string): string {
  return name.replace(HOUSE_PREFIX, "");
}

// The match is case-sensitive and prose writes "the Twins", so a name that
// carries its own article also needs the bare form.
function stripArticle(name: string): string {
  return name.replace(ARTICLE_PREFIX, "");
}

function uniqueOrdered(forms: string[]): string[] {
  return [...new Set(forms.filter((f) => f.length >= 2))];
}

function targetKey(target: { kind: ProseLinkKind; slug: string }): string {
  return `${target.kind}/${target.slug}`;
}

function targetsOf<T extends { slug: string; draft: boolean }>({
  kind,
  entries,
  forms,
  mentioned,
}: {
  kind: ProseLinkKind;
  entries: ReadonlyArray<{ frontmatter: T }>;
  forms: (frontmatter: T) => string[];
  mentioned: ReadonlySet<string>;
}): ProseLinkTarget[] {
  // The first target to register a surface form keeps it, so an entry the
  // page lists in `mentions` goes first: three characters are named
  // "Rhaenys Targaryen", and only the page knows which one it means.
  const ordered = entries.toSorted(
    (a, b) =>
      Number(mentioned.has(b.frontmatter.slug)) -
      Number(mentioned.has(a.frontmatter.slug)),
  );
  return ordered.flatMap<ProseLinkTarget>(({ frontmatter: fm }) => {
    if (fm.draft) return [];
    const surfaceForms = uniqueOrdered(forms(fm));
    if (surfaceForms.length === 0) return [];
    return [
      {
        slug: fm.slug,
        kind,
        href: `/${KIND_PATH[kind]}/${fm.slug}/`,
        surfaceForms,
      },
    ];
  });
}

export function buildProseLinkIndex(args: {
  allCharacters: ReadonlyArray<{ slug: string; frontmatter: Character }>;
  allHouses: ReadonlyArray<{ slug: string; frontmatter: House }>;
  allWeapons: ReadonlyArray<{ slug: string; frontmatter: Weapon }>;
  allDragons: ReadonlyArray<{ slug: string; frontmatter: Dragon }>;
  allCastles: ReadonlyArray<{ slug: string; frontmatter: Castle }>;
  allBattles: ReadonlyArray<{ slug: string; frontmatter: Battle }>;
  allEvents: ReadonlyArray<{ slug: string; frontmatter: Event }>;
  current: {
    kind: ProseLinkKind;
    slug: string;
    mentions: readonly string[];
  };
}): ProseLinkIndex {
  const {
    allCharacters,
    allHouses,
    allWeapons,
    allDragons,
    allCastles,
    allBattles,
    allEvents,
    current,
  } = args;
  const mentioned = new Set(current.mentions);

  const characterTargets = targetsOf({
    kind: "character",
    entries: allCharacters,
    mentioned,
    forms: (fm) => {
      if (fm.placeholder) return [];
      const forms = [fm.name, ...fm.aliases];
      return mentioned.has(fm.slug)
        ? [...forms, firstNameToken(fm.name)]
        : forms;
    },
  });

  const houseTargets = targetsOf({
    kind: "house",
    entries: allHouses,
    mentioned,
    forms: (fm) => {
      if (!mentioned.has(fm.slug)) return [fm.name];
      const short = shortHouseName(fm.name);
      return short && short !== fm.name ? [fm.name, short] : [fm.name];
    },
  });

  const weaponTargets = targetsOf({
    kind: "weapon",
    entries: allWeapons,
    mentioned,
    forms: (fm) => [fm.name, ...fm.aliases],
  });

  const dragonTargets = targetsOf({
    kind: "dragon",
    entries: allDragons,
    mentioned,
    forms: (fm) => [fm.name, ...fm.aliases],
  });

  // A castle that shares its name with a house (Darry, Rosby, the Hightower)
  // reads as the house or its lord in most sentences, and `mentions` cannot
  // separate the two because both carry the same slug. Such castles never
  // auto-link; an explicit markdown link in the body still does.
  const houseShortNames = new Set(
    allHouses.map((h) => shortHouseName(h.frontmatter.name)),
  );
  const castleTargets = targetsOf({
    kind: "castle",
    entries: allCastles,
    mentioned,
    forms: (fm) => {
      const forms = [fm.name, stripArticle(fm.name)];
      return forms.some((f) => houseShortNames.has(f)) ? [] : forms;
    },
  });

  const battleTargets = targetsOf({
    kind: "battle",
    entries: allBattles,
    mentioned,
    forms: (fm) => [fm.name, ...fm.aliases, stripArticle(fm.name)],
  });

  const eventTargets = targetsOf({
    kind: "event",
    entries: allEvents,
    mentioned,
    forms: (fm) => [fm.name, ...fm.aliases, stripArticle(fm.name)],
  });

  return {
    targets: [
      ...characterTargets,
      ...houseTargets,
      ...weaponTargets,
      ...dragonTargets,
      ...castleTargets,
      ...battleTargets,
      ...eventTargets,
    ],
    self: { kind: current.kind, slug: current.slug },
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CompiledIndex = {
  pattern: RegExp;
  formToTarget: Map<string, ProseLinkTarget>;
};

function compileIndex(index: ProseLinkIndex): CompiledIndex | null {
  const selfKey = index.self ? targetKey(index.self) : null;
  const formTargets = index.targets
    .filter((t) => targetKey(t) !== selfKey)
    .flatMap((t) => t.surfaceForms.map((form) => ({ form, target: t })));
  // The first target to register a surface form keeps it.
  const formToTarget = new Map<string, ProseLinkTarget>(
    firstByKey({ items: formTargets, keyOf: ({ form }) => form }).map(
      ({ form, target }) => [form, target],
    ),
  );
  if (formToTarget.size === 0) return null;
  const allForms = [...formToTarget.keys()].toSorted(
    (a, b) => b.length - a.length,
  );
  const pattern = new RegExp(
    "\\b(" + allForms.map(escapeRegex).join("|") + ")\\b",
    "g",
  );
  return { pattern, formToTarget };
}

type Mention = {
  node: Text;
  parent: Parent;
  start: number;
  matched: string;
  target: ProseLinkTarget;
};

export function remarkProseLinks(index: ProseLinkIndex): Plugin<[], Root> {
  return function plugin() {
    const compiled = compileIndex(index);
    return function transformer(tree: Root) {
      if (!compiled) return;
      const mentions = proseTextNodes(tree).flatMap(({ node, parent }) =>
        findMentions({ node, parent, compiled }),
      );
      // A target links only at its first mention in the document.
      const firstMentions = firstByKey({
        items: mentions,
        keyOf: (m) => targetKey(m.target),
      });
      Map.groupBy(firstMentions, (m) => m.node).forEach(
        (nodeMentions, node) => {
          const { parent } = nodeMentions[0];
          const idx = parent.children.indexOf(node);
          if (idx === -1) return;
          parent.children.splice(
            idx,
            1,
            ...linkify({ value: node.value, mentions: nodeMentions }),
          );
        },
      );
    };
  };
}

function proseTextNodes(tree: Root): { node: Text; parent: Parent }[] {
  const found: { node: Text; parent: Parent }[] = [];
  visitParents(tree, "text", (node: Text, ancestors: Parent[]) => {
    if (ancestors.some((a) => SKIP_ANCESTOR_TYPES.has(a.type))) return SKIP;
    const parent = ancestors.at(-1);
    if (parent) found.push({ node, parent });
  });
  return found;
}

function findMentions({
  node,
  parent,
  compiled,
}: {
  node: Text;
  parent: Parent;
  compiled: CompiledIndex;
}): Mention[] {
  return [...node.value.matchAll(compiled.pattern)].flatMap((match) => {
    const matched = match[1];
    const target = compiled.formToTarget.get(matched);
    return target
      ? [{ node, parent, start: match.index, matched, target }]
      : [];
  });
}

function linkify({
  value,
  mentions,
}: {
  value: string;
  mentions: readonly Mention[];
}): (Text | Link)[] {
  const cuts = [0, ...mentions.map((m) => m.start + m.matched.length)];
  const nodes = mentions.flatMap((m, i): (Text | Link)[] => [
    { type: "text", value: value.slice(cuts[i], m.start) },
    {
      type: "link",
      url: m.target.href,
      title: null,
      children: [{ type: "text", value: m.matched }],
    },
  ]);
  const tail: Text = { type: "text", value: value.slice(cuts.at(-1) ?? 0) };
  return [...nodes, tail].filter((n) => n.type !== "text" || n.value !== "");
}
