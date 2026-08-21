/**
 * The tiny JSX reader the a11y checks run on.
 *
 * Not a real parser: it masks comments and strings, scans for tag opens, and
 * pulls out attributes and nesting depth. That is enough to answer "which
 * element, with which props, inside what" without pulling in a TypeScript AST,
 * and it is the only part of this skill that touches raw source text.
 */
import fs from "node:fs/promises";
import path from "node:path";

export type AttributeValue =
  | { kind: "literal"; text: string }
  | { kind: "expression"; text: string }
  | { kind: "flag" };

export type Tag = {
  file: string;
  name: string;
  kind: "open" | "close" | "self";
  attributes: ReadonlyMap<string, AttributeValue>;
  /** Index of `<`. */
  start: number;
  /** Index just past `>`. */
  end: number;
  /** Index of the matching close tag's `<`, or `end` when self-closing. */
  innerEnd: number;
  /** Positions of this tag's open ancestors in the same file's tag list. */
  ancestors: readonly number[];
  line: number;
};

export type SourceFile = {
  path: string;
  source: string;
  tags: readonly Tag[];
  /**
   * `const body = useMemo(() => (<>…</>), [deps])` ranges, keyed by identifier.
   * JSX parked in a memo is textually outside the element that renders it, so
   * ancestor checks would miss half of `FamilyTreeChart` without this.
   */
  memos: ReadonlyMap<string, { start: number; end: number }>;
};

// ── source loading ───────────────────────────────────────────────────

export async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".")) return [];
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return [full];
    }),
  );
  return nested.flat();
}

/**
 * Blanks out `//` and block comments before anything else looks at the file.
 * Comments quote JSX freely, and an apostrophe in prose ("the library's") would
 * otherwise open a quote state that swallows the next real tag. The lookbehind
 * keeps `https://` out of it.
 */
function maskComments(source: string): string {
  return source.replace(/\/\*[^]*?\*\/|(?<![:\\])\/\/[^\n]*/g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
}

type CharStates = {
  /** Brace nesting depth at each index; `{` and `}` both read as the outer depth + 0/1. */
  depth: Int32Array;
  /** Parenthesis nesting depth, used only to find where a `useMemo(` closes. */
  paren: Int32Array;
  /** 1 when the index sits inside a string or template literal. */
  quoted: Uint8Array;
};

/**
 * One pass per file recording brace depth and quote state at every index. Tag
 * boundaries then fall out of it: the `>` that closes `<button onClick={() =>
 * go()}>` is the first `>` back at the tag's own depth, which no regex can find
 * on its own.
 */
function scanCharStates(source: string): CharStates {
  const depth = new Int32Array(source.length);
  const paren = new Int32Array(source.length);
  const quoted = new Uint8Array(source.length);
  Array.from(source).reduce<{
    depth: number;
    paren: number;
    quote: string | null;
    escaped: boolean;
  }>(
    (state, char, index) => {
      depth[index] = state.depth;
      paren[index] = state.paren;
      quoted[index] = state.quote === null ? 0 : 1;
      if (state.quote !== null) {
        if (state.escaped) return { ...state, escaped: false };
        if (char === "\\") return { ...state, escaped: true };
        return char === state.quote ? { ...state, quote: null } : state;
      }
      if (char === '"' || char === "'" || char === "`") {
        return { ...state, quote: char };
      }
      if (char === "{") return { ...state, depth: state.depth + 1 };
      if (char === "}") return { ...state, depth: state.depth - 1 };
      if (char === "(") return { ...state, paren: state.paren + 1 };
      if (char === ")") return { ...state, paren: state.paren - 1 };
      return state;
    },
    { depth: 0, paren: 0, quote: null, escaped: false },
  );
  return { depth, paren, quoted };
}

/** `const x = useMemo(` … the `)` that closes it, per identifier. */
function findMemoRanges({
  source,
  states,
}: {
  source: string;
  states: CharStates;
}): Map<string, { start: number; end: number }> {
  const closers = [...source.matchAll(/\)/g)].flatMap((match) =>
    match.index === undefined ? [] : [match.index],
  );
  return [
    ...source.matchAll(/const ([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*useMemo\s*\(/g),
  ].reduce<Map<string, { start: number; end: number }>>((ranges, match) => {
    const start = (match.index ?? 0) + match[0].length;
    const inner = states.paren[start - 1] + 1;
    const end =
      closers.find(
        (position) =>
          position > start &&
          states.paren[position] === inner &&
          states.quoted[position] === 0,
      ) ?? start;
    return ranges.set(match[1], { start, end });
  }, new Map());
}

export function lineOf({
  source,
  index,
}: {
  source: string;
  index: number;
}): number {
  return source.slice(0, index).split("\n").length;
}

/**
 * Reads one JSX opening tag's attributes. Names are only accepted at the tag's
 * own brace depth and outside quotes, which is what keeps the words inside
 * `aria-label={open ? "Close menu" : "Open menu"}` from parsing as attributes.
 */
function parseAttributes({
  source,
  from,
  to,
  states,
  tagDepth,
  closeBraces,
}: {
  source: string;
  from: number;
  to: number;
  states: CharStates;
  tagDepth: number;
  closeBraces: readonly number[];
}): Map<string, AttributeValue> {
  const region = source.slice(from, to);
  const matches = [...region.matchAll(/(?:^|\s)([A-Za-z_][A-Za-z0-9_:.$-]*)/g)];
  return matches.reduce<Map<string, AttributeValue>>((attributes, match) => {
    const name = match[1];
    const nameStart = from + (match.index ?? 0) + match[0].length - name.length;
    if (states.quoted[nameStart] === 1) return attributes;
    if (states.depth[nameStart] !== tagDepth) return attributes;

    const after = source.slice(nameStart + name.length, to);
    const equals = /^\s*=\s*/.exec(after);
    if (!equals) return attributes.set(name, { kind: "flag" });

    const valueStart = nameStart + name.length + equals[0].length;
    const opener = source[valueStart];
    if (opener === '"' || opener === "'") {
      const end = source.indexOf(opener, valueStart + 1);
      const text = end === -1 ? "" : source.slice(valueStart + 1, end);
      return attributes.set(name, { kind: "literal", text });
    }
    if (opener === "{") {
      const innerDepth = states.depth[valueStart] + 1;
      const end =
        closeBraces.find(
          (position) =>
            position > valueStart &&
            states.depth[position] === innerDepth &&
            states.quoted[position] === 0,
        ) ?? to;
      return attributes.set(name, {
        kind: "expression",
        text: source.slice(valueStart + 1, end).trim(),
      });
    }
    return attributes.set(name, { kind: "flag" });
  }, new Map());
}

/**
 * Turns a file into a flat, ancestor-aware tag list.
 *
 * Two guards keep TypeScript generics out of the list: a `<` glued to an
 * identifier is never JSX (`useState<Value>`), and a tag name that never
 * appears as a closing tag and never self-closes is not an element.
 */
export function analyse({
  filePath,
  raw,
}: {
  filePath: string;
  raw: string;
}): SourceFile {
  const source = maskComments(raw);
  const states = scanCharStates(source);
  const closeBraces = [...source.matchAll(/\}/g)].flatMap((match) =>
    match.index === undefined ? [] : [match.index],
  );
  const closers = [...source.matchAll(/>/g)].flatMap((match) =>
    match.index === undefined ? [] : [match.index],
  );
  const closedNames = new Set(
    [...source.matchAll(/<\/([A-Za-z][A-Za-z0-9._-]*)\s*>/g)].map(
      (match) => match[1],
    ),
  );

  const parsed = [...source.matchAll(/<(\/?)([A-Za-z][A-Za-z0-9._-]*)/g)]
    .flatMap((match) => {
      const start = match.index ?? 0;
      const isClose = match[1] === "/";
      const name = match[2];
      if (states.quoted[start] === 1) return [];
      const previous = source[start - 1] ?? " ";
      if (!isClose && /[A-Za-z0-9_$]/.test(previous)) return [];

      const tagDepth = states.depth[start];
      const gt = closers.find(
        (position) =>
          position > start &&
          states.depth[position] === tagDepth &&
          states.quoted[position] === 0,
      );
      if (gt === undefined) return [];
      const selfClosing = source[gt - 1] === "/";
      if (!isClose && !selfClosing && !closedNames.has(name)) return [];

      return [
        {
          name,
          kind: isClose ? "close" : selfClosing ? "self" : "open",
          start,
          end: gt + 1,
          attributes: isClose
            ? new Map<string, AttributeValue>()
            : parseAttributes({
                source,
                from: start + match[0].length,
                to: selfClosing ? gt - 1 : gt,
                states,
                tagDepth,
                closeBraces,
              }),
        } as const,
      ];
    })
    .filter((tag) => tag.kind !== "close" || true);

  // Second pass: pair opens with closes so every tag knows its ancestors and
  // where its children end.
  const withNesting = parsed.reduce<{
    stack: number[];
    ancestors: (readonly number[])[];
    innerEnds: number[];
  }>(
    (state, tag, index) => {
      if (tag.kind === "close") {
        const owner = state.stack.findLast(
          (position) => parsed[position].name === tag.name,
        );
        if (owner === undefined) {
          return {
            ...state,
            ancestors: [...state.ancestors, []],
            innerEnds: [...state.innerEnds, tag.end],
          };
        }
        const innerEnds = state.innerEnds.slice();
        innerEnds[owner] = tag.start;
        return {
          stack: state.stack.slice(0, state.stack.indexOf(owner)),
          ancestors: [...state.ancestors, []],
          innerEnds: [...innerEnds, tag.end],
        };
      }
      const ancestors = state.stack.slice();
      return {
        stack: tag.kind === "open" ? [...state.stack, index] : state.stack,
        ancestors: [...state.ancestors, ancestors],
        innerEnds: [...state.innerEnds, tag.end],
      };
    },
    { stack: [], ancestors: [], innerEnds: [] },
  );

  return {
    path: filePath,
    source,
    memos: findMemoRanges({ source, states }),
    tags: parsed.map((tag, index) => ({
      file: filePath,
      name: tag.name,
      kind: tag.kind,
      attributes: tag.attributes,
      start: tag.start,
      end: tag.end,
      innerEnd: withNesting.innerEnds[index] ?? tag.end,
      ancestors: withNesting.ancestors[index] ?? [],
      line: lineOf({ source, index: tag.start }),
    })),
  };
}
