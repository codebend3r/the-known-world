/**
 * Static accessibility audit for `app/` and `components/`.
 *
 * The repo lints with `jsx-a11y` but switches seven of its rules off in
 * `.oxlintrc.json`, so the defects this reports are, by construction, the ones
 * CI cannot see. Every check here either replaces a disabled rule or covers a
 * surface no linter models: SVG canvases, combobox IDREFs, per-route heading
 * order, and token contrast.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/tkw-a11y-audit/audit-a11y.ts
 *   bun .claude/skills/tkw-a11y-audit/audit-a11y.ts --json
 *
 * Read-only. Writes nothing, fixes nothing. Exits 1 when findings exist.
 */
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOTS = ["app", "components"] as const;
const TOKEN_SHEET = "styles/globals.scss";

/** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

/** Elements that are focusable and operable without help. */
const INTERACTIVE_ELEMENTS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "details",
  "option",
]);

/** Roles whose host must be reachable by Tab in its own right. */
const FOCUSABLE_ROLES = new Set([
  "application",
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "radio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
]);

/**
 * Roles a composite widget drives through `aria-activedescendant` instead of
 * the tab sequence. Flagging these for a missing `tabIndex` would push authors
 * into a roving-tabindex rewrite the pattern does not call for.
 */
const MANAGED_ROLES = new Set(["gridcell", "option", "row", "tab", "treeitem"]);

/** Roles that name a container rather than a control. */
const NAMED_CONTAINER_ROLES = new Set([
  "application",
  "group",
  "graphics-document",
  "graphics-symbol",
  "img",
  "region",
]);

const POINTER_HANDLERS = new Set([
  "onClick",
  "onMouseDown",
  "onMouseUp",
  "onPointerDown",
  "onPointerUp",
  "onDoubleClick",
]);

const KEY_HANDLERS = new Set(["onKeyDown", "onKeyUp", "onKeyPress"]);

/** `Accordion` picks its heading tag from a prop, so the level lives at the call site. */
const DYNAMIC_HEADING_COMPONENT = "Accordion";
const DEFAULT_ACCORDION_LEVEL = 3;

type AttributeValue =
  | { kind: "literal"; text: string }
  | { kind: "expression"; text: string }
  | { kind: "flag" };

type Tag = {
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

type SourceFile = {
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

type Finding = {
  /** Stable machine name, e.g. `svg-unnamed`. */
  code: string;
  severity: "error" | "warn";
  file: string;
  line: number;
  element: string;
  message: string;
};

type ContrastRow = {
  foreground: string;
  background: string;
  ratio: number;
  passesText: boolean;
  passesLarge: boolean;
};

// ── source loading ───────────────────────────────────────────────────

async function walk(dir: string): Promise<string[]> {
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

function lineOf({ source, index }: { source: string; index: number }): number {
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
function analyse({
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

// ── tag helpers ──────────────────────────────────────────────────────

function attributeText(value: AttributeValue | undefined): string {
  if (!value) return "";
  return value.kind === "flag" ? "" : value.text;
}

function has({ tag, name }: { tag: Tag; name: string }): boolean {
  return tag.attributes.has(name);
}

/** `role="img"` gives `img`; `role={x}` gives the raw expression; absent gives `""`. */
function roleOf(tag: Tag): string {
  const role = tag.attributes.get("role");
  return role?.kind === "literal" ? role.text : "";
}

function isHidden(tag: Tag): boolean {
  const hidden = tag.attributes.get("aria-hidden");
  if (!hidden) return false;
  if (hidden.kind === "literal") return hidden.text !== "false";
  // `aria-hidden={decorative || undefined}` and a bare `aria-hidden` both mean
  // "hidden at least some of the time"; treating them as hidden avoids
  // reporting a defect the author already reasoned about.
  return true;
}

/** Hidden on every render, not just some. Only this justifies stripping a name. */
function isAlwaysHidden(tag: Tag): boolean {
  const hidden = tag.attributes.get("aria-hidden");
  if (!hidden) return false;
  return hidden.kind === "flag" || hidden.text === "true";
}

function hiddenInTree({
  tag,
  tags,
  strict = false,
}: {
  tag: Tag;
  tags: readonly Tag[];
  strict?: boolean;
}): boolean {
  const test = strict ? isAlwaysHidden : isHidden;
  return test(tag) || tag.ancestors.some((index) => test(tags[index]));
}

/**
 * Every tag inside a tag, following `{memoName}` references into the `useMemo`
 * that produced them. Without the second half, a chart that parks its body in a
 * memo reads as an empty `<svg>`.
 */
function childrenOf({
  file,
  tag,
  index,
}: {
  file: SourceFile;
  tag: Tag;
  index: number;
}): Tag[] {
  const direct = file.tags.filter(
    (candidate, position) =>
      position > index &&
      candidate.start < tag.innerEnd &&
      candidate.kind !== "close",
  );
  const referenced = [
    ...file.source
      .slice(tag.end, tag.innerEnd)
      .matchAll(/\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}/g),
  ].flatMap((match) => {
    const range = file.memos.get(match[1]);
    if (!range) return [];
    return file.tags.filter(
      (candidate) =>
        candidate.kind !== "close" &&
        candidate.start >= range.start &&
        candidate.start < range.end,
    );
  });
  return [...direct, ...referenced];
}

/** Any element that can carry a name, minus wrappers the author hid. */
function accessibleName({
  file,
  tag,
  index,
}: {
  file: SourceFile;
  tag: Tag;
  index: number;
}): boolean {
  const labelled =
    !!attributeText(tag.attributes.get("aria-label")) ||
    has({ tag, name: "aria-labelledby" }) ||
    !!attributeText(tag.attributes.get("title"));
  if (labelled) return true;
  if (tag.kind === "self") return false;

  const inner = file.source.slice(tag.end, tag.innerEnd);
  const hiddenRanges = childrenOf({ file, tag, index })
    .filter((child) => isHidden(child))
    .map((child) => [child.start, child.innerEnd] as const);
  const visible = Array.from(inner)
    .map((char, offset) => {
      const absolute = tag.end + offset;
      const covered = hiddenRanges.some(
        ([from, to]) => absolute >= from && absolute <= to,
      );
      return covered ? " " : char;
    })
    .join("");
  const text = visible
    .replace(/<[^>]*>/g, " ")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/\{\/\*[^]*?\*\/\}/g, " ")
    .trim();
  if (!!text) return true;

  return childrenOf({ file, tag, index }).some(
    (child) =>
      !isHidden(child) &&
      (!!attributeText(child.attributes.get("aria-label")) ||
        child.name === "title"),
  );
}

// ── checks ───────────────────────────────────────────────────────────

const IMAGE_TAGS = new Set(["img", "Image"]);

function checkImages(file: SourceFile): Finding[] {
  const headings = file.tags
    .filter((tag) => /^h[1-6]$/.test(tag.name) && tag.kind === "open")
    .map((tag) =>
      file.source
        .slice(tag.end, tag.innerEnd)
        .replace(/<[^>]*>/g, "")
        .trim()
        .replace(/^\{|\}$/g, "")
        .trim(),
    );

  return file.tags.flatMap((tag, index) => {
    if (!IMAGE_TAGS.has(tag.name) || tag.kind === "close") return [];
    const at = { file: file.path, line: tag.line, element: `<${tag.name}>` };
    const alt = tag.attributes.get("alt");
    if (!alt) {
      return [
        {
          ...at,
          code: "img-no-alt",
          severity: "error" as const,
          message:
            'no `alt`. Meaningful art needs a sentence; decoration needs `alt=""`.',
        },
      ];
    }
    const text = attributeText(alt);
    if (!text) return [];
    if (
      hiddenInTree({ tag: file.tags[index], tags: file.tags, strict: true })
    ) {
      return [
        {
          ...at,
          code: "img-alt-redundant",
          severity: "error" as const,
          message: `alt \`${text}\` sits inside an \`aria-hidden\` subtree and is never announced. Use \`alt=""\`.`,
        },
      ];
    }
    if (/^(image|picture|photo|graphic) of /i.test(text)) {
      return [
        {
          ...at,
          code: "img-alt-noise",
          severity: "warn" as const,
          message: `alt \`${text}\` restates the element type. Drop the prefix.`,
        },
      ];
    }
    if (alt.kind === "expression" && headings.includes(alt.text)) {
      return [
        {
          ...at,
          code: "alt-duplicates-heading",
          severity: "error" as const,
          message: `alt \`{${alt.text}}\` repeats the page \`<h1>\` verbatim, so the image adds nothing. Describe what it depicts.`,
        },
      ];
    }
    return [];
  });
}

function checkSvg(file: SourceFile): Finding[] {
  return file.tags.flatMap((tag, index) => {
    if (tag.kind === "close") return [];
    const at = { file: file.path, line: tag.line, element: `<${tag.name}>` };

    if (tag.name === "image") {
      if (hiddenInTree({ tag, tags: file.tags })) return [];
      if (has({ tag, name: "aria-label" })) return [];
      const named = tag.ancestors.some((position) =>
        childrenOf({ file, tag: file.tags[position], index: position }).some(
          (child) => child.name === "title",
        ),
      );
      if (named) return [];
      return [
        {
          ...at,
          code: "svg-image-unnamed",
          severity: "error" as const,
          message:
            'SVG `<image>` has no name and no `aria-hidden`. Raster backdrops inside a labelled canvas take `aria-hidden="true"`.',
        },
      ];
    }

    if (tag.name !== "svg") return [];
    if (hiddenInTree({ tag, tags: file.tags })) return [];

    const role = roleOf(tag);
    const kids = childrenOf({ file, tag, index });
    const hasTitle = kids.some((child) => child.name === "title");
    const named =
      !!attributeText(tag.attributes.get("aria-label")) ||
      has({ tag, name: "aria-labelledby" }) ||
      hasTitle;

    if (!role) {
      return [
        {
          ...at,
          code: "svg-unnamed",
          severity: "error" as const,
          message:
            '`<svg>` carries no role. Icons take `aria-hidden`, standalone art takes `role="img"` plus `<title>`, canvases take `role="application"`.',
        },
      ];
    }
    const links = kids.filter(
      (child) => child.name === "a" || child.name === "Link",
    );
    if (role === "img" && links.length > 0) {
      return [
        {
          ...at,
          code: "svg-img-prunes-links",
          severity: "error" as const,
          message: `\`role="img"\` prunes descendants, so the ${links.length} link(s) drawn inside are invisible to assistive tech. Use \`role="application"\` or \`role="group"\`.`,
        },
      ];
    }
    if (NAMED_CONTAINER_ROLES.has(role) && !named) {
      return [
        {
          ...at,
          code: "svg-role-unnamed",
          severity: "error" as const,
          message: `\`role="${role}"\` needs a name: \`aria-label\`, \`aria-labelledby\`, or a \`<title>\` child.`,
        },
      ];
    }
    return [];
  });
}

function checkInteractions(file: SourceFile): Finding[] {
  return file.tags.flatMap((tag, index) => {
    if (tag.kind === "close") return [];
    const at = { file: file.path, line: tag.line, element: `<${tag.name}>` };
    const role = roleOf(tag);
    const lower = tag.name.toLowerCase();
    const nativelyInteractive =
      INTERACTIVE_ELEMENTS.has(lower) && tag.name === lower;
    const pointer = [...POINTER_HANDLERS].filter((handler) =>
      has({ tag, name: handler }),
    );
    const keys = [...KEY_HANDLERS].filter((handler) =>
      has({ tag, name: handler }),
    );
    const isComponent = /^[A-Z]/.test(tag.name);

    // A decorative overlay is out of the accessibility tree entirely, so there
    // is no keyboard path to add. The dismiss must exist elsewhere (Escape, a
    // real Close button), which is a review question, not a static one.
    if (hiddenInTree({ tag, tags: file.tags })) return [];

    const findings: Finding[] = [];

    if (
      pointer.length > 0 &&
      !nativelyInteractive &&
      !isComponent &&
      !FOCUSABLE_ROLES.has(role) &&
      !MANAGED_ROLES.has(role)
    ) {
      findings.push({
        ...at,
        code: "static-interaction",
        severity: "error",
        message: `${pointer.join(", ")} on a non-interactive element${
          !!role ? ` carrying \`role="${role}"\`` : " with no role"
        }. Use a \`<button>\`, or the canvas pattern: \`role="application"\`, \`tabIndex={0}\`, \`onKeyDown\`, \`aria-label\`.`,
      });
    }

    if (
      role === "application" &&
      ![...KEY_HANDLERS].some((handler) => has({ tag, name: handler }))
    ) {
      findings.push({
        ...at,
        code: "canvas-not-operable",
        severity: "error",
        message:
          '`role="application"` tells assistive tech to hand every keystroke to this element, and nothing here listens. Add an `onKeyDown`.',
      });
    }

    if (
      pointer.includes("onClick") &&
      keys.length === 0 &&
      !nativelyInteractive &&
      !isComponent &&
      !MANAGED_ROLES.has(role)
    ) {
      findings.push({
        ...at,
        code: "click-no-key",
        severity: "error",
        message:
          "`onClick` with no keyboard equivalent. Mouse-only operation fails WCAG 2.1.1.",
      });
    }

    if (
      FOCUSABLE_ROLES.has(role) &&
      !nativelyInteractive &&
      !has({ tag, name: "tabIndex" })
    ) {
      findings.push({
        ...at,
        code: "role-not-focusable",
        severity: "error",
        message: `\`role="${role}"\` is not reachable by Tab. Add \`tabIndex={0}\`.`,
      });
    }

    const tabIndex = attributeText(tag.attributes.get("tabIndex"));
    if (
      has({ tag, name: "tabIndex" }) &&
      !nativelyInteractive &&
      !isComponent &&
      !role &&
      !/-1/.test(tabIndex)
    ) {
      findings.push({
        ...at,
        code: "noninteractive-tabindex",
        severity: "warn",
        message:
          "`tabIndex` on an element with no role puts an unnamed stop in the tab order.",
      });
    }

    const wantsName =
      (nativelyInteractive && lower !== "input" && lower !== "option") ||
      FOCUSABLE_ROLES.has(role);
    const isLinkWithoutHref = lower === "a" && !has({ tag, name: "href" });
    if (
      wantsName &&
      !isLinkWithoutHref &&
      !accessibleName({ file, tag, index })
    ) {
      findings.push({
        ...at,
        code: "control-no-name",
        severity: "error",
        message:
          "control has no accessible name. Add `aria-label`, or text content that is not `aria-hidden`.",
      });
    }

    return findings;
  });
}

function checkCombobox(file: SourceFile): Finding[] {
  return file.tags.flatMap((tag) => {
    if (tag.kind === "close") return [];
    const role = roleOf(tag);
    const at = { file: file.path, line: tag.line, element: `<${tag.name}>` };

    if (role === "listbox") {
      const named =
        !!attributeText(tag.attributes.get("aria-label")) ||
        has({ tag, name: "aria-labelledby" });
      return named
        ? []
        : [
            {
              ...at,
              code: "listbox-unnamed",
              severity: "error" as const,
              message:
                '`role="listbox"` with no name. Screen readers announce it as an unlabelled list.',
            },
          ];
    }

    if (role === "option") {
      const problems = [
        has({ tag, name: "aria-selected" }) ? null : "`aria-selected`",
        has({ tag, name: "id" }) ? null : "`id` (for `aria-activedescendant`)",
      ].filter((problem): problem is string => problem !== null);
      return problems.length === 0
        ? []
        : [
            {
              ...at,
              code: "option-incomplete",
              severity: "error" as const,
              message: `\`role="option"\` missing ${problems.join(" and ")}.`,
            },
          ];
    }

    if (role !== "combobox") return [];

    const missing = [
      has({ tag, name: "aria-expanded" }) ? null : "`aria-expanded`",
      has({ tag, name: "aria-controls" }) || has({ tag, name: "aria-owns" })
        ? null
        : "`aria-controls`",
    ].filter((problem): problem is string => problem !== null);

    const structural =
      missing.length === 0
        ? []
        : [
            {
              ...at,
              code: "combobox-incomplete",
              severity: "error" as const,
              message: `\`role="combobox"\` missing ${missing.join(" and ")}.`,
            },
          ];

    // The popup an `aria-controls` points at must exist whenever the combobox
    // does. When the listbox is behind a `&&` guard the IDREF dangles the whole
    // time the field is closed, which is most of its life.
    const controls = attributeText(tag.attributes.get("aria-controls"));
    const target = file.tags.find(
      (candidate) =>
        candidate.kind !== "close" &&
        attributeText(candidate.attributes.get("id")) === controls &&
        candidate.start !== tag.start,
    );
    const guard =
      !!target && /(&&|\?)\s*\(?\s*$/.test(file.source.slice(0, target.start));
    const dangling = guard
      ? [
          {
            file: file.path,
            line: target.line,
            element: `<${target.name}>`,
            code: "combobox-dangling-popup",
            severity: "error" as const,
            message: `\`aria-controls={${controls}}\` points at an element rendered behind a conditional, so the IDREF resolves to nothing while the popup is closed.`,
          },
        ]
      : [];

    return [...structural, ...dangling];
  });
}

// ── heading order ────────────────────────────────────────────────────

type HeadingSource =
  | { kind: "level"; level: number }
  | { kind: "component"; name: string };

function headingSources(file: SourceFile): HeadingSource[] {
  return file.tags.flatMap((tag): HeadingSource[] => {
    if (tag.kind === "close") return [];
    const level = /^h([1-6])$/.exec(tag.name);
    if (level) return [{ kind: "level", level: Number(level[1]) }];
    if (tag.name === DYNAMIC_HEADING_COMPONENT) {
      const raw = attributeText(tag.attributes.get("headingLevel"));
      const parsed = Number(raw.replace(/[^0-9]/g, ""));
      return [
        {
          kind: "level",
          level:
            Number.isFinite(parsed) && parsed > 0
              ? parsed
              : DEFAULT_ACCORDION_LEVEL,
        },
      ];
    }
    if (/^[A-Z]/.test(tag.name)) return [{ kind: "component", name: tag.name }];
    return [];
  });
}

/**
 * Resolves a route's heading levels through the components it renders. One
 * component can contribute headings from a component it renders in turn
 * (`FamilyTreeViews` gives `FamilyTreeViewSwitcher` gives `<h2>`), so this
 * recurses with a visited set rather than stopping at depth one.
 */
function resolveLevels({
  sources,
  byComponent,
  seen,
}: {
  sources: readonly HeadingSource[];
  byComponent: ReadonlyMap<string, readonly HeadingSource[]>;
  seen: ReadonlySet<string>;
}): number[] {
  return sources.flatMap((entry) => {
    if (entry.kind === "level") return [entry.level];
    if (seen.has(entry.name)) return [];
    const nested = byComponent.get(entry.name);
    if (!nested) return [];
    return resolveLevels({
      sources: nested,
      byComponent,
      seen: new Set([...seen, entry.name]),
    });
  });
}

function checkHeadings({
  routes,
  byComponent,
}: {
  routes: readonly SourceFile[];
  byComponent: ReadonlyMap<string, readonly HeadingSource[]>;
}): Finding[] {
  return routes.flatMap((route) => {
    const levels = resolveLevels({
      sources: headingSources(route),
      byComponent,
      seen: new Set(),
    });
    const at = { file: route.path, line: 1, element: "route" };
    if (levels.length === 0) return [];

    const h1Count = levels.filter((level) => level === 1).length;
    const structural: Finding[] =
      h1Count === 1
        ? []
        : [
            {
              ...at,
              code: h1Count === 0 ? "heading-no-h1" : "heading-many-h1",
              severity: "error",
              message:
                h1Count === 0
                  ? `route renders ${levels.join(", ")} with no \`<h1>\`.`
                  : `route renders ${h1Count} \`<h1>\` elements.`,
            },
          ];

    const skips = levels.flatMap((level, index) => {
      if (index === 0) return [];
      const deepest = Math.min(...levels.slice(0, index));
      const previous = levels[index - 1];
      return level > previous + 1 && level > deepest + 1
        ? [
            {
              ...at,
              code: "heading-skip",
              severity: "error" as const,
              message: `heading order jumps h${previous} to h${level} (full order: ${levels.join(", ")}).`,
            },
          ]
        : [];
    });

    return [...structural, ...skips];
  });
}

// ── viewport zoom ────────────────────────────────────────────────────

function checkViewport(file: SourceFile): Finding[] {
  if (!/export const viewport/.test(file.source)) return [];
  const locked = [
    /userScalable:\s*false/.test(file.source) ? "`userScalable: false`" : null,
    /maximumScale:\s*[1-4](\D|$)/.test(file.source) ? "`maximumScale`" : null,
  ].filter((problem): problem is string => problem !== null);
  return locked.length === 0
    ? []
    : [
        {
          file: file.path,
          line: lineOf({
            source: file.source,
            index: file.source.indexOf("export const viewport"),
          }),
          element: "viewport",
          code: "viewport-zoom-locked",
          severity: "error",
          message: `${locked.join(" and ")} blocks pinch zoom. WCAG 1.4.4 requires 200% scaling.`,
        },
      ];
}

// ── colour contrast ──────────────────────────────────────────────────

const FOREGROUND_TOKENS = [
  "--tkw-ink",
  "--tkw-ink-body",
  "--tkw-ink-muted",
  "--tkw-ink-dim",
  "--tkw-gold",
  "--tkw-gold-bright",
  "--tkw-extant",
  "--tkw-deposed",
  "--tkw-contested",
  "--tkw-attainted",
  "--tkw-extinct",
] as const;

const BACKGROUND_TOKENS = [
  "--tkw-bg",
  "--tkw-bg-deep",
  "--tkw-surface",
  "--tkw-surface-solid",
  "--tkw-surface-raised",
] as const;

/** Every translucent surface composites over the page ground, never over white. */
const COMPOSITE_BASE = "--tkw-bg";

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgb | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(
      value.trim(),
    );
  if (!rgba) return null;
  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

function composite({ over, under }: { over: Rgb; under: Rgb }): Rgb {
  return {
    r: over.r * over.a + under.r * (1 - over.a),
    g: over.g * over.a + under.g * (1 - over.a),
    b: over.b * over.a + under.b * (1 - over.a),
    a: 1,
  };
}

function relativeLuminance(color: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrastRatio({
  foreground,
  background,
}: {
  foreground: Rgb;
  background: Rgb;
}): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

async function auditContrast(): Promise<ContrastRow[]> {
  const sheet = await fs.readFile(
    path.join(process.cwd(), TOKEN_SHEET),
    "utf-8",
  );
  const tokens = new Map(
    [...sheet.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gi)].flatMap((match) => {
      const color = parseColor(match[2]);
      return color === null ? [] : [[match[1], color] as const];
    }),
  );
  const base = tokens.get(COMPOSITE_BASE);
  if (!base) return [];

  const solid = (name: string): Rgb | null => {
    const raw = tokens.get(name);
    if (!raw) return null;
    return raw.a === 1 ? raw : composite({ over: raw, under: base });
  };

  return BACKGROUND_TOKENS.flatMap((backgroundName) => {
    const background = solid(backgroundName);
    if (background === null) return [];
    return FOREGROUND_TOKENS.flatMap((foregroundName) => {
      const foreground = solid(foregroundName);
      if (foreground === null) return [];
      const ratio = contrastRatio({ foreground, background });
      return [
        {
          foreground: foregroundName,
          background: backgroundName,
          ratio: Math.round(ratio * 100) / 100,
          passesText: ratio >= AA_TEXT,
          passesLarge: ratio >= AA_LARGE,
        },
      ];
    });
  });
}

// ── run ──────────────────────────────────────────────────────────────

const json = Bun.argv.includes("--json");

const files = (
  await Promise.all(
    SOURCE_ROOTS.map(async (root) => {
      const dir = path.join(process.cwd(), root);
      const exists = await fs
        .access(dir)
        .then(() => true)
        .catch(() => false);
      return exists ? walk(dir) : [];
    }),
  )
)
  .flat()
  .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
  .sort();

const sources: SourceFile[] = await Promise.all(
  files.map(async (file) => {
    const raw = await fs.readFile(file, "utf-8");
    return analyse({ filePath: path.relative(process.cwd(), file), raw });
  }),
);

// A component's exported names, so a route's `<FamilyTreeViews />` can be
// resolved back to the headings that component actually renders.
const byComponent = new Map(
  sources.flatMap((file) =>
    [...file.source.matchAll(/export function ([A-Z][A-Za-z0-9_]*)/g)].map(
      (match) => [match[1], headingSources(file)] as const,
    ),
  ),
);

const routes = sources.filter((file) =>
  /^app\/.*(page|not-found)\.tsx$/.test(file.path),
);

const findings = [
  ...sources.flatMap(checkImages),
  ...sources.flatMap(checkSvg),
  ...sources.flatMap(checkInteractions),
  ...sources.flatMap(checkCombobox),
  ...sources.flatMap(checkViewport),
  ...checkHeadings({ routes, byComponent }),
].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const contrast = await auditContrast();
const contrastFailures = contrast.filter((row) => !row.passesText);

const byCode = findings.reduce<Map<string, Finding[]>>(
  (groups, finding) =>
    groups.set(finding.code, [...(groups.get(finding.code) ?? []), finding]),
  new Map(),
);

if (json) {
  console.log(
    JSON.stringify(
      {
        findings,
        counts: Object.fromEntries(
          [...byCode.entries()].map(([code, group]) => [code, group.length]),
        ),
        contrast,
        scanned: sources.length,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `A11Y AUDIT · ${sources.length} files · ${findings.length} findings\n`,
  );
  if (findings.length === 0) {
    console.log("  no findings");
  } else {
    [...byCode.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([code, group]) => {
        console.log(`${code.toUpperCase()} (${group.length})`);
        group.forEach((finding) => {
          console.log(`  ${finding.file}:${finding.line}  ${finding.element}`);
          console.log(`    ${finding.message}`);
        });
        console.log("");
      });
  }

  console.log(
    `CONTRAST · ${contrast.length} token pairs · ${contrastFailures.length} below AA text (${AA_TEXT}:1)`,
  );
  contrastFailures
    .sort((a, b) => a.ratio - b.ratio)
    .forEach((row) => {
      const verdict = row.passesLarge ? "large text only" : "fails all AA";
      console.log(
        `  ${row.ratio.toFixed(2)}:1  ${row.foreground} on ${row.background}  (${verdict})`,
      );
    });
  if (contrastFailures.length === 0) console.log("  all pairs pass");
}

process.exit(findings.length > 0 || contrastFailures.length > 0 ? 1 : 0);
