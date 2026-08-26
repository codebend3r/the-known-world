/**
 * The accessibility rules. Each takes one parsed file and returns findings.
 *
 * Every check here either covers a surface no linter models (SVG canvases,
 * combobox IDREFs, per-route heading order) or a rule Oxlint cannot run
 * without flagging correct markup. See `docs/tooling-rule-mapping.md`.
 */
import type { AttributeValue, SourceFile, Tag } from "./jsx-source";

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

export type Finding = {
  /** Stable machine name, e.g. `svg-unnamed`. */
  code: string;
  severity: "error" | "warn";
  file: string;
  line: number;
  element: string;
  message: string;
};

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

export function checkImages(file: SourceFile): Finding[] {
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

export function checkSvg(file: SourceFile): Finding[] {
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

export function checkInteractions(file: SourceFile): Finding[] {
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

export function checkCombobox(file: SourceFile): Finding[] {
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

export function headingSources(file: SourceFile): HeadingSource[] {
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

export function checkHeadings({
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

export function checkViewport(file: SourceFile): Finding[] {
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
