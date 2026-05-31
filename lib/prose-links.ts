import type { Plugin } from "unified";
import type { Root, Text, Link, Parent } from "mdast";
import { visitParents, SKIP } from "unist-util-visit-parents";
import type { Character, House, Weapon, Dragon } from "@/lib/schemas";

export type ProseLinkTarget = {
  slug: string;
  kind: "character" | "house" | "weapon" | "dragon";
  href: string;
  surfaceForms: string[];
};

export type ProseLinkIndex = {
  targets: ProseLinkTarget[];
  selfSlug: string | null;
};

const HOUSE_PREFIX = /^House\s+/i;
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

function uniqueOrdered(forms: string[]): string[] {
  const seen = new Set<string>();
  return forms.reduce<string[]>((acc, f) => {
    if (f.length < 2 || seen.has(f)) return acc;
    seen.add(f);
    acc.push(f);
    return acc;
  }, []);
}

export function buildProseLinkIndex(args: {
  allCharacters: ReadonlyArray<{ slug: string; frontmatter: Character }>;
  allHouses: ReadonlyArray<{ slug: string; frontmatter: House }>;
  allWeapons: ReadonlyArray<{ slug: string; frontmatter: Weapon }>;
  allDragons: ReadonlyArray<{ slug: string; frontmatter: Dragon }>;
  current: {
    kind: "character" | "house" | "weapon" | "dragon";
    slug: string;
    mentions: readonly string[];
  };
}): ProseLinkIndex {
  const { allCharacters, allHouses, allWeapons, allDragons, current } = args;
  const mentioned = new Set(current.mentions);

  const characterTargets = allCharacters.flatMap<ProseLinkTarget>((c) => {
    const fm = c.frontmatter;
    if (fm.placeholder || fm.draft) return [];
    const forms = [fm.name, ...fm.aliases];
    if (mentioned.has(fm.slug)) forms.push(firstNameToken(fm.name));
    const surfaceForms = uniqueOrdered(forms);
    if (surfaceForms.length === 0) return [];
    return [
      {
        slug: fm.slug,
        kind: "character",
        href: `/characters/${fm.slug}/`,
        surfaceForms,
      },
    ];
  });

  const houseTargets = allHouses.flatMap<ProseLinkTarget>((h) => {
    const fm = h.frontmatter;
    if (fm.draft) return [];
    const forms = [fm.name];
    if (mentioned.has(fm.slug)) {
      const short = shortHouseName(fm.name);
      if (short && short !== fm.name) forms.push(short);
    }
    const surfaceForms = uniqueOrdered(forms);
    if (surfaceForms.length === 0) return [];
    return [
      {
        slug: fm.slug,
        kind: "house",
        href: `/houses/${fm.slug}/`,
        surfaceForms,
      },
    ];
  });

  const weaponTargets = allWeapons.flatMap<ProseLinkTarget>((w) => {
    const fm = w.frontmatter;
    if (fm.draft) return [];
    const surfaceForms = uniqueOrdered([fm.name, ...fm.aliases]);
    if (surfaceForms.length === 0) return [];
    return [
      {
        slug: fm.slug,
        kind: "weapon",
        href: `/weapons/${fm.slug}/`,
        surfaceForms,
      },
    ];
  });

  const dragonTargets = allDragons.flatMap<ProseLinkTarget>((d) => {
    const fm = d.frontmatter;
    if (fm.draft) return [];
    const surfaceForms = uniqueOrdered([fm.name, ...fm.aliases]);
    if (surfaceForms.length === 0) return [];
    return [
      {
        slug: fm.slug,
        kind: "dragon",
        href: `/dragons/${fm.slug}/`,
        surfaceForms,
      },
    ];
  });

  return {
    targets: [
      ...characterTargets,
      ...houseTargets,
      ...weaponTargets,
      ...dragonTargets,
    ],
    selfSlug: current.slug,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CompiledIndex = {
  pattern: RegExp;
  formToTarget: Map<string, ProseLinkTarget>;
  selfSlug: string | null;
};

function compileIndex(index: ProseLinkIndex): CompiledIndex | null {
  const formToTarget = new Map<string, ProseLinkTarget>();
  const allForms = index.targets
    .filter((t) => t.slug !== index.selfSlug)
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
  return { pattern, formToTarget, selfSlug: index.selfSlug };
}

export function remarkProseLinks(index: ProseLinkIndex): Plugin<[], Root> {
  return function plugin() {
    const compiled = compileIndex(index);
    return function transformer(tree: Root) {
      if (!compiled) return;
      const usedSlugs = new Set<string>();

      visitParents(tree, "text", (node: Text, ancestors: Parent[]) => {
        if (ancestors.some((a) => SKIP_ANCESTOR_TYPES.has(a.type))) return SKIP;
        const parent = ancestors[ancestors.length - 1];
        if (!parent) return;
        const replacements = scanText(node, compiled, usedSlugs);
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
  usedSlugs: Set<string>,
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
    if (target.slug === compiled.selfSlug) continue;
    if (usedSlugs.has(target.slug)) continue;
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
    usedSlugs.add(target.slug);
    lastIndex = end;
    produced = true;
  }
  if (!produced) return null;
  if (lastIndex < value.length) {
    out.push({ type: "text", value: value.slice(lastIndex) });
  }
  return out;
}
