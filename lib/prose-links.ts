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
  const seen = new Set<string>();
  return forms.reduce<string[]>((acc, f) => {
    if (f.length < 2 || seen.has(f)) return acc;
    seen.add(f);
    acc.push(f);
    return acc;
  }, []);
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
      if (mentioned.has(fm.slug)) forms.push(firstNameToken(fm.name));
      return forms;
    },
  });

  const houseTargets = targetsOf({
    kind: "house",
    entries: allHouses,
    mentioned,
    forms: (fm) => {
      const forms = [fm.name];
      if (mentioned.has(fm.slug)) {
        const short = shortHouseName(fm.name);
        if (short && short !== fm.name) forms.push(short);
      }
      return forms;
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
  const formToTarget = new Map<string, ProseLinkTarget>();
  const allForms = index.targets
    .filter((t) => targetKey(t) !== selfKey)
    .reduce<string[]>((acc, t) => {
      t.surfaceForms.forEach((f) => {
        if (formToTarget.has(f)) return;
        formToTarget.set(f, t);
        acc.push(f);
      });
      return acc;
    }, []);
  if (allForms.length === 0) return null;
  allForms.sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    "\\b(" + allForms.map(escapeRegex).join("|") + ")\\b",
    "g",
  );
  return { pattern, formToTarget };
}

export function remarkProseLinks(index: ProseLinkIndex): Plugin<[], Root> {
  return function plugin() {
    const compiled = compileIndex(index);
    return function transformer(tree: Root) {
      if (!compiled) return;
      const usedKeys = new Set<string>();

      visitParents(tree, "text", (node: Text, ancestors: Parent[]) => {
        if (ancestors.some((a) => SKIP_ANCESTOR_TYPES.has(a.type))) return SKIP;
        const parent = ancestors[ancestors.length - 1];
        if (!parent) return;
        const replacements = scanText(node, compiled, usedKeys);
        if (replacements === null) return;
        const idx = parent.children.indexOf(node as never);
        if (idx === -1) return;
        parent.children.splice(idx, 1, ...(replacements as never[]));
        return [SKIP, idx + replacements.length];
      });
    };
  };
}

function scanText(
  node: Text,
  compiled: CompiledIndex,
  usedKeys: Set<string>,
): (Text | Link)[] | null {
  const value = node.value;
  if (!value) return null;
  const out: (Text | Link)[] = [];
  let lastIndex = 0;
  let produced = false;
  compiled.pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = compiled.pattern.exec(value)) !== null) {
    const matched = match[1];
    const target = compiled.formToTarget.get(matched);
    if (!target) continue;
    const key = targetKey(target);
    if (usedKeys.has(key)) continue;
    const start = match.index;
    const end = start + matched.length;
    if (start > lastIndex) {
      out.push({ type: "text", value: value.slice(lastIndex, start) });
    }
    out.push({
      type: "link",
      url: target.href,
      title: null,
      children: [{ type: "text", value: matched }],
    });
    usedKeys.add(key);
    lastIndex = end;
    produced = true;
  }
  if (!produced) return null;
  if (lastIndex < value.length) {
    out.push({ type: "text", value: value.slice(lastIndex) });
  }
  return out;
}
