import type { Plugin } from 'unified';
import type { Root, Text, Link, Parent } from 'mdast';
import { visitParents, SKIP } from 'unist-util-visit-parents';
import type { Character, House } from '@/lib/schemas';

export type ProseLinkTarget = {
  slug: string;
  kind: 'character' | 'house';
  href: string;
  surfaceForms: string[];
};

export type ProseLinkIndex = {
  targets: ProseLinkTarget[];
  selfSlug: string | null;
};

const HOUSE_PREFIX = /^House\s+/i;
const SKIP_ANCESTOR_TYPES = new Set([
  'link',
  'linkReference',
  'code',
  'inlineCode',
  'heading',
]);

function firstNameToken(name: string): string {
  const trimmed = name.trim();
  const idx = trimmed.search(/\s/);
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

function shortHouseName(name: string): string {
  return name.replace(HOUSE_PREFIX, '');
}

function uniqueOrdered(forms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of forms) {
    if (f.length < 2) continue;
    if (seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}

export function buildProseLinkIndex(args: {
  allCharacters: ReadonlyArray<{ slug: string; frontmatter: Character }>;
  allHouses: ReadonlyArray<{ slug: string; frontmatter: House }>;
  current: { kind: 'character' | 'house'; slug: string; mentions: readonly string[] };
}): ProseLinkIndex {
  const { allCharacters, allHouses, current } = args;
  const mentioned = new Set(current.mentions);
  const targets: ProseLinkTarget[] = [];

  for (const c of allCharacters) {
    const fm = c.frontmatter;
    if (fm.placeholder || fm.draft) continue;
    const forms = [fm.name, ...fm.aliases];
    if (mentioned.has(fm.slug)) forms.push(firstNameToken(fm.name));
    const surfaceForms = uniqueOrdered(forms);
    if (surfaceForms.length === 0) continue;
    targets.push({
      slug: fm.slug,
      kind: 'character',
      href: `/characters/${fm.slug}/`,
      surfaceForms,
    });
  }

  for (const h of allHouses) {
    const fm = h.frontmatter;
    if (fm.draft) continue;
    const forms = [fm.name];
    if (mentioned.has(fm.slug)) {
      const short = shortHouseName(fm.name);
      if (short && short !== fm.name) forms.push(short);
    }
    const surfaceForms = uniqueOrdered(forms);
    if (surfaceForms.length === 0) continue;
    targets.push({
      slug: fm.slug,
      kind: 'house',
      href: `/houses/${fm.slug}/`,
      surfaceForms,
    });
  }

  return { targets, selfSlug: current.slug };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type CompiledIndex = {
  pattern: RegExp;
  formToTarget: Map<string, ProseLinkTarget>;
  selfSlug: string | null;
};

function compileIndex(index: ProseLinkIndex): CompiledIndex | null {
  const formToTarget = new Map<string, ProseLinkTarget>();
  const allForms: string[] = [];
  for (const t of index.targets) {
    if (t.slug === index.selfSlug) continue;
    for (const f of t.surfaceForms) {
      if (formToTarget.has(f)) continue;
      formToTarget.set(f, t);
      allForms.push(f);
    }
  }
  if (allForms.length === 0) return null;
  allForms.sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    '\\b(' + allForms.map(escapeRegex).join('|') + ')\\b',
    'g',
  );
  return { pattern, formToTarget, selfSlug: index.selfSlug };
}

export function remarkProseLinks(index: ProseLinkIndex): Plugin<[], Root> {
  return function plugin() {
    const compiled = compileIndex(index);
    return function transformer(tree: Root) {
      if (!compiled) return;
      const usedSlugs = new Set<string>();

      visitParents(tree, 'text', (node: Text, ancestors: Parent[]) => {
        for (const a of ancestors) {
          if (SKIP_ANCESTOR_TYPES.has(a.type)) return SKIP;
        }
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
      out.push({ type: 'text', value: value.slice(lastIndex, start) });
    }
    out.push({
      type: 'link',
      url: target.href,
      title: null,
      children: [{ type: 'text', value: matched }],
    });
    usedSlugs.add(target.slug);
    lastIndex = end;
    produced = true;
  }
  if (!produced) return null;
  if (lastIndex < value.length) {
    out.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return out;
}
