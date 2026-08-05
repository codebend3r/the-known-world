# Vertical (Chart) Family Tree View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in SVG-based, pan/zoomable, top-down genealogy chart as a togglable alternative to the existing list-style `FamilyTree` on house detail pages, plus a polymorphic `ViewToggle` that can drive both the list/grid toggles and the new tree-view toggle.

**Architecture:** Server-side pipeline (`buildFamilyTree` → `enrichTreeWithPortraits` → `layoutFamilyTree`) computes a fully laid-out chart at build time and passes it to a client `FamilyTreeChart` SVG island. The island owns pan/zoom state via the SVG `transform` attribute on an inner `<g>`. A `FamilyTreeViewSwitcher` reads `?tree=list|chart` from the URL and shows the matching view. Default mode is `list`. List view is unchanged.

**Tech Stack:** Next.js 16 (static export, `output: 'export'`, `trailingSlash: true`), React 19, TypeScript, SCSS modules, Vitest + Testing Library, Bun for scripts.

**Spec:** `docs/superpowers/specs/2026-06-06-vertical-family-tree-design.md`

**Conventions for every task:**

- `@/` alias for all in-repo imports, never relative.
- One commit per task; subject starts with `TKW:` (see `tkw-git-commit-and-pr-format` skill).
- Never add `Co-Authored-By: Claude` or any agent attribution.
- Run `bun run test` before committing each task — all tests must pass.
- The existing test suite (280 tests as of `6eeb209`) must stay green.

---

## Task 1: Polymorphic `ViewToggle` + icon extraction + caller migration

**Files:**

- Modify: `components/ViewToggle/ViewToggle.tsx`
- Modify: `components/ViewToggle/ViewToggle.test.tsx`
- Modify: `components/ViewToggle/index.ts`
- Create: `components/ViewToggle/icons.tsx`
- Modify: `components/FilteredCharacterList/FilteredCharacterList.tsx`
- Modify: `components/FilteredHouseList/FilteredHouseList.tsx`

This refactor is preserved as a single commit because the API change and its callers must move together to keep the tree green.

- [ ] **Step 1: Rewrite the failing `ViewToggle` test for the generic API**

Replace the entire contents of `components/ViewToggle/ViewToggle.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewToggle, GridIcon, ListIcon } from "@/components/ViewToggle";

const TWO_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];

describe("ViewToggle (polymorphic)", () => {
  it('marks the selected option with aria-pressed="true"', () => {
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={() => {}} />,
    );
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /list view/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("calls onChange when an unselected option is clicked", () => {
    const onChange = vi.fn();
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("does not call onChange when the selected option is clicked", () => {
    const onChange = vi.fn();
    render(
      <ViewToggle options={TWO_OPTIONS} value="list" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes a labelled group using the default ariaLabel", () => {
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={() => {}} />,
    );
    expect(screen.getByRole("group", { name: /^view$/i })).toBeDefined();
  });

  it("uses a custom ariaLabel when provided", () => {
    render(
      <ViewToggle
        options={TWO_OPTIONS}
        value="grid"
        onChange={() => {}}
        ariaLabel="Family tree view"
      />,
    );
    expect(
      screen.getByRole("group", { name: /family tree view/i }),
    ).toBeDefined();
  });

  it("renders a third option (smoke test for the generic)", () => {
    const THREE = [
      { value: "a" as const, label: "Option A", icon: <span>A</span> },
      { value: "b" as const, label: "Option B", icon: <span>B</span> },
      { value: "c" as const, label: "Option C", icon: <span>C</span> },
    ];
    const onChange = vi.fn();
    render(<ViewToggle options={THREE} value="b" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /option c/i }));
    expect(onChange).toHaveBeenCalledWith("c");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/ViewToggle/ViewToggle.test.tsx
```

Expected: failures across all tests — `ViewToggle` does not yet accept `options`, and `GridIcon` / `ListIcon` are not exported.

- [ ] **Step 3: Create the icons module**

Create `components/ViewToggle/icons.tsx`:

```tsx
export function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <rect x="1" y="2" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="1" y="12" width="14" height="2" fill="currentColor" />
    </svg>
  );
}

export function TreeChartIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <circle cx="8" cy="3" r="2" fill="currentColor" />
      <circle cx="3" cy="13" r="2" fill="currentColor" />
      <circle cx="8" cy="13" r="2" fill="currentColor" />
      <circle cx="13" cy="13" r="2" fill="currentColor" />
      <path
        d="M 8 5 V 8 H 3 V 11 M 8 8 V 11 M 8 8 H 13 V 11"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
```

- [ ] **Step 4: Rewrite `ViewToggle` to be polymorphic**

Replace the entire contents of `components/ViewToggle/ViewToggle.tsx` with:

```tsx
"use client";

import type { ReactNode } from "react";
import styles from "@/components/ViewToggle/ViewToggle.module.scss";

export type ViewMode = "grid" | "list";

type Option<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
};

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "View",
}: Props<T>) {
  const handleSelect = (next: T) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className={styles.toggle} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.button}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => handleSelect(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Update the `ViewToggle` barrel to re-export icons**

Replace `components/ViewToggle/index.ts` with:

```ts
export * from "@/components/ViewToggle/ViewToggle";
export * from "@/components/ViewToggle/icons";
```

- [ ] **Step 6: Migrate `FilteredHouseList` to the new API**

In `components/FilteredHouseList/FilteredHouseList.tsx`:

Replace this import:

```tsx
import { ViewToggle, type ViewMode } from "@/components/ViewToggle";
```

with:

```tsx
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  type ViewMode,
} from "@/components/ViewToggle";
```

Immediately after the `REGION_CARD_CLASS` constant block (around line 63), add:

```tsx
const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];
```

Replace the JSX call:

```tsx
<ViewToggle value={view} onChange={handleViewChange} />
```

with:

```tsx
<ViewToggle options={VIEW_OPTIONS} value={view} onChange={handleViewChange} />
```

- [ ] **Step 7: Migrate `FilteredCharacterList` to the new API**

In `components/FilteredCharacterList/FilteredCharacterList.tsx`, apply the identical migration:

Replace the import line:

```tsx
import { ViewToggle, type ViewMode } from "@/components/ViewToggle";
```

with:

```tsx
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  type ViewMode,
} from "@/components/ViewToggle";
```

Immediately after the `REGION_CARD_CLASS` constant (around line 40), add:

```tsx
const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];
```

Find the JSX `<ViewToggle value={view} onChange={handleViewChange} />` and replace it with:

```tsx
<ViewToggle options={VIEW_OPTIONS} value={view} onChange={handleViewChange} />
```

- [ ] **Step 8: Run the whole suite**

```bash
bun run test
```

Expected: 280+ tests pass (5 new `ViewToggle` cases replace the prior 4, net +1).

- [ ] **Step 9: Run the linter and type checker**

```bash
bun run lint
bunx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 10: Commit**

```bash
git add components/ViewToggle/ components/FilteredCharacterList/FilteredCharacterList.tsx components/FilteredHouseList/FilteredHouseList.tsx
git commit -m "$(cat <<'EOF'
TKW: `ViewToggle` becomes polymorphic

- accepts `options` array of `{ value, label, icon }` and a typed generic `T`
- `GridIcon`, `ListIcon`, `TreeChartIcon` extracted to `components/ViewToggle/icons.tsx`
- `FilteredHouseList` and `FilteredCharacterList` pass a local `VIEW_OPTIONS`
- `ariaLabel` prop overrides the default `"View"` group label
EOF
)"
```

---

## Task 2: `enrichTreeWithPortraits` server-side helper

**Files:**

- Create: `lib/family-tree-portraits.ts`
- Create: `lib/family-tree-portraits.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/family-tree-portraits.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

function spouse(overrides: Partial<TreeSpouse> = {}): TreeSpouse {
  return {
    slug: null,
    name: "Spouse",
    alias: null,
    sex: null,
    placeholder: false,
    inHouse: false,
    titles: [],
    ...overrides,
  };
}

function node(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    slug: "person",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    born: null,
    died: null,
    titles: [],
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe("enrichTreeWithPortraits", () => {
  it("calls findPortrait for in-house, non-placeholder persons", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "eddard",
        name: "Eddard",
        sex: "m",
        children: [node({ slug: "robb", name: "Robb", sex: "m" })],
      }),
    ];
    const [eddard] = await enrichTreeWithPortraits(tree, find);
    expect(eddard.portrait).toBe("/characters/eddard.png");
    expect(eddard.children[0].portrait).toBe("/characters/robb.png");
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("returns null portrait for placeholder persons without calling findPortrait", async () => {
    const find = vi.fn();
    const tree: TreeNode[] = [
      node({ slug: "unknown", name: "Unknown", placeholder: true }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.portrait).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("returns null portrait for external persons without calling findPortrait", async () => {
    const find = vi.fn();
    const tree: TreeNode[] = [
      node({ slug: "foreign", name: "Foreign", external: true }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.portrait).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("calls findPortrait for in-house spouses and sets null for external spouses", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "p",
        spouses: [
          spouse({ slug: "in", name: "In", inHouse: true, sex: "f" }),
          spouse({ slug: "out", name: "Out", inHouse: false, sex: "f" }),
        ],
      }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.spouses[0].portrait).toBe("/characters/in.png");
    expect(n.spouses[1].portrait).toBeNull();
    expect(find).toHaveBeenCalledWith("in", "f");
  });

  it("memoizes per-slug so duplicate slugs hit findPortrait once", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "p",
        children: [
          node({ slug: "shared", name: "Shared", sex: "f" }),
          node({ slug: "shared", name: "Shared", sex: "f" }),
        ],
      }),
    ];
    await enrichTreeWithPortraits(tree, find);
    const sharedCalls = find.mock.calls.filter((c) => c[0] === "shared");
    expect(sharedCalls.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test lib/family-tree-portraits.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement `enrichTreeWithPortraits`**

Create `lib/family-tree-portraits.ts`:

```ts
import type { Character } from "@/lib/schemas";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

export interface EnrichedTreeSpouse extends TreeSpouse {
  portrait: string | null;
}

export interface EnrichedTreeNode extends Omit<
  TreeNode,
  "spouses" | "children"
> {
  portrait: string | null;
  spouses: EnrichedTreeSpouse[];
  children: EnrichedTreeNode[];
}

export type FindPortrait = (
  slug: string,
  sex: Character["sex"],
) => Promise<string>;

export async function enrichTreeWithPortraits(
  roots: TreeNode[],
  findPortrait: FindPortrait,
): Promise<EnrichedTreeNode[]> {
  const cache = new Map<string, Promise<string>>();
  const lookup = (slug: string, sex: Character["sex"]): Promise<string> => {
    const existing = cache.get(slug);
    if (existing) return existing;
    const next = findPortrait(slug, sex);
    cache.set(slug, next);
    return next;
  };

  const enrichSpouse = async (s: TreeSpouse): Promise<EnrichedTreeSpouse> => {
    const portrait =
      s.inHouse && s.slug && !s.placeholder
        ? await lookup(s.slug, s.sex)
        : null;
    return { ...s, portrait };
  };

  const enrichNode = async (n: TreeNode): Promise<EnrichedTreeNode> => {
    const portrait =
      n.placeholder || n.external ? null : await lookup(n.slug, n.sex);
    const [spouses, children] = await Promise.all([
      Promise.all(n.spouses.map(enrichSpouse)),
      Promise.all(n.children.map(enrichNode)),
    ]);
    return { ...n, portrait, spouses, children };
  };

  return Promise.all(roots.map(enrichNode));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test lib/family-tree-portraits.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/family-tree-portraits.ts lib/family-tree-portraits.test.ts
git commit -m "$(cat <<'EOF'
TKW: `enrichTreeWithPortraits` resolves portraits server-side

- walks the tree once, calling `findPortrait` only for in-house non-placeholder persons
- `null` portrait for placeholders, external persons, and external/unnamed spouses
- per-slug memoization avoids duplicate filesystem hits
EOF
)"
```

---

## Task 3: `layoutFamilyTree` pure layout function

**Files:**

- Create: `lib/family-tree-layout.ts`
- Create: `lib/family-tree-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/family-tree-layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { layoutFamilyTree, LAYOUT_CONSTANTS } from "@/lib/family-tree-layout";
import type {
  EnrichedTreeNode,
  EnrichedTreeSpouse,
} from "@/lib/family-tree-portraits";

const { DOT_R, H_SPACING, V_SPACING, SPOUSE_GAP, PADDING } = LAYOUT_CONSTANTS;

function spouse(
  overrides: Partial<EnrichedTreeSpouse> = {},
): EnrichedTreeSpouse {
  return {
    slug: null,
    name: "Spouse",
    alias: null,
    sex: null,
    placeholder: false,
    inHouse: false,
    titles: [],
    portrait: null,
    ...overrides,
  };
}

function node(overrides: Partial<EnrichedTreeNode> = {}): EnrichedTreeNode {
  return {
    slug: "p",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    born: null,
    died: null,
    titles: [],
    portrait: null,
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe("layoutFamilyTree", () => {
  it("places a single root at top-left padding offset", () => {
    const result = layoutFamilyTree([node({ slug: "a" })]);
    const a = result.persons.find((p) => p.slug === "a");
    expect(a).toBeDefined();
    expect(a!.x).toBe(PADDING + DOT_R);
    expect(a!.y).toBe(PADDING + DOT_R);
    expect(result.bounds.width).toBe(PADDING * 2 + DOT_R * 2);
    expect(result.bounds.height).toBe(PADDING * 2 + DOT_R * 2);
  });

  it("places three children evenly under a parent, parent centred", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({ slug: "c1" }),
          node({ slug: "c2" }),
          node({ slug: "c3" }),
        ],
      }),
    ]);
    const xs = (slug: string) => result.persons.find((p) => p.slug === slug)!.x;
    const [c1, c2, c3] = [xs("c1"), xs("c2"), xs("c3")];
    expect(c2 - c1).toBe(DOT_R * 2 + H_SPACING);
    expect(c3 - c2).toBe(DOT_R * 2 + H_SPACING);
    expect(xs("p")).toBe((c1 + c3) / 2);
    expect(result.persons.find((p) => p.slug === "p")!.y).toBe(PADDING + DOT_R);
    expect(result.persons.find((p) => p.slug === "c1")!.y).toBe(
      PADDING + DOT_R + V_SPACING,
    );
  });

  it("stacks a deep linear lineage by V_SPACING per generation", () => {
    const result = layoutFamilyTree([
      node({
        slug: "g0",
        children: [node({ slug: "g1", children: [node({ slug: "g2" })] })],
      }),
    ]);
    const y = (slug: string) => result.persons.find((p) => p.slug === slug)!.y;
    expect(y("g1") - y("g0")).toBe(V_SPACING);
    expect(y("g2") - y("g1")).toBe(V_SPACING);
  });

  it("treats a spouse pair as a wider unit during sibling packing", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({
            slug: "c1",
            spouses: [spouse({ slug: "s1", name: "S1", inHouse: false })],
          }),
          node({ slug: "c2" }),
        ],
      }),
    ]);
    const c1 = result.persons.find((p) => p.slug === "c1")!;
    const c2 = result.persons.find((p) => p.slug === "c2")!;
    const s1 = result.persons.find((p) => p.slug === "s1")!;
    expect(s1.x).toBe(c1.x + SPOUSE_GAP + DOT_R * 2);
    expect(c2.x - s1.x).toBe(DOT_R * 2 + H_SPACING);
  });

  it("descends children edges from the spouse-pair midpoint", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        spouses: [spouse({ slug: "ps", name: "PS", inHouse: false })],
        children: [node({ slug: "c" })],
      }),
    ]);
    const p = result.persons.find((x) => x.slug === "p")!;
    const ps = result.persons.find((x) => x.slug === "ps")!;
    expect(result.childEdges.length).toBeGreaterThan(0);
    const edge = result.childEdges[0];
    expect(edge.from.x).toBe((p.x + ps.x) / 2);
  });

  it("includes placeholder and external persons in layout (not filtered out)", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        children: [
          node({ slug: "ph", placeholder: true }),
          node({ slug: "ex", external: true }),
        ],
      }),
    ]);
    expect(result.persons.find((p) => p.slug === "ph")).toBeDefined();
    expect(result.persons.find((p) => p.slug === "ex")).toBeDefined();
  });

  it("emits one spouseEdge per person-spouse pair", () => {
    const result = layoutFamilyTree([
      node({
        slug: "p",
        spouses: [
          spouse({ slug: "s1", name: "S1", inHouse: false }),
          spouse({ slug: "s2", name: "S2", inHouse: false }),
        ],
      }),
    ]);
    expect(result.spouseEdges.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test lib/family-tree-layout.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement the layout function**

Create `lib/family-tree-layout.ts`:

```ts
import type {
  EnrichedTreeNode,
  EnrichedTreeSpouse,
} from "@/lib/family-tree-portraits";

export const LAYOUT_CONSTANTS = {
  DOT_R: 14,
  H_SPACING: 24,
  V_SPACING: 80,
  SPOUSE_GAP: 24,
  PADDING: 20,
} as const;

const { DOT_R, H_SPACING, V_SPACING, SPOUSE_GAP, PADDING } = LAYOUT_CONSTANTS;

export interface LayoutPerson {
  slug: string;
  name: string;
  alias: string | null;
  sex: "m" | "f" | null;
  placeholder: boolean;
  external: boolean;
  portrait: string | null;
  titles: string[];
  born: number | null;
  died: number | null;
  x: number;
  y: number;
  isSpouse: boolean;
}

export interface LayoutSpouseEdge {
  personSlug: string;
  spouseSlug: string;
}

export interface LayoutChildEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  busY: number;
}

export interface LaidOutChart {
  persons: LayoutPerson[];
  spouseEdges: LayoutSpouseEdge[];
  childEdges: LayoutChildEdge[];
  bounds: { width: number; height: number };
}

function unitWidth(n: EnrichedTreeNode): number {
  const personW = DOT_R * 2;
  const spousesW = n.spouses.length * (SPOUSE_GAP + DOT_R * 2);
  return personW + spousesW;
}

function subtreeWidth(n: EnrichedTreeNode): number {
  const own = unitWidth(n);
  if (n.children.length === 0) return own;
  const childrenW = n.children.reduce(
    (acc, c, i) => acc + subtreeWidth(c) + (i === 0 ? 0 : H_SPACING),
    0,
  );
  return Math.max(own, childrenW);
}

function spousePosition(personX: number, index: number): number {
  return personX + (index + 1) * (SPOUSE_GAP + DOT_R * 2);
}

function pairMidpoint(personX: number, spouses: EnrichedTreeSpouse[]): number {
  if (spouses.length === 0) return personX;
  const lastSpouseX = spousePosition(personX, spouses.length - 1);
  return (personX + lastSpouseX) / 2;
}

function placePerson(
  n: EnrichedTreeNode,
  isSpouse: boolean,
  x: number,
  y: number,
): LayoutPerson {
  return {
    slug: n.slug,
    name: n.name,
    alias: n.alias,
    sex: n.sex,
    placeholder: n.placeholder,
    external: n.external,
    portrait: n.portrait,
    titles: n.titles,
    born: n.born,
    died: n.died,
    x,
    y,
    isSpouse,
  };
}

function placeSpouse(
  s: EnrichedTreeSpouse,
  x: number,
  y: number,
): LayoutPerson {
  return {
    slug: s.slug ?? `${s.name}-spouse`,
    name: s.name,
    alias: s.alias,
    sex: s.sex,
    placeholder: s.placeholder,
    external: !s.inHouse,
    portrait: s.portrait,
    titles: s.titles,
    born: null,
    died: null,
    x,
    y,
    isSpouse: true,
  };
}

interface PlacementCtx {
  persons: LayoutPerson[];
  spouseEdges: LayoutSpouseEdge[];
  childEdges: LayoutChildEdge[];
}

function placeSubtree(
  n: EnrichedTreeNode,
  leftX: number,
  depth: number,
  ctx: PlacementCtx,
): { centerX: number; rightX: number } {
  const y = PADDING + DOT_R + depth * V_SPACING;
  const ownW = unitWidth(n);

  let childCenterX = leftX + ownW / 2;
  let rightX = leftX + ownW;

  if (n.children.length > 0) {
    const totalChildW = n.children.reduce(
      (acc, c, i) => acc + subtreeWidth(c) + (i === 0 ? 0 : H_SPACING),
      0,
    );
    const childrenStart = Math.max(leftX, leftX + (ownW - totalChildW) / 2);
    let cursor = childrenStart;
    const childCenters: number[] = [];
    n.children.forEach((c) => {
      const placed = placeSubtree(c, cursor, depth + 1, ctx);
      childCenters.push(placed.centerX);
      cursor = placed.rightX + H_SPACING;
    });
    rightX = Math.max(rightX, cursor - H_SPACING);
    childCenterX =
      (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
  }

  const personX = childCenterX - ownW / 2 + DOT_R;
  const person = placePerson(n, false, personX, y);
  ctx.persons.push(person);

  n.spouses.forEach((s, i) => {
    const sX = spousePosition(personX, i);
    ctx.persons.push(placeSpouse(s, sX, y));
    ctx.spouseEdges.push({
      personSlug: n.slug,
      spouseSlug: s.slug ?? `${s.name}-spouse`,
    });
  });

  if (n.children.length > 0) {
    const fromX = pairMidpoint(personX, n.spouses);
    const fromY = y + DOT_R;
    const busY = fromY + (V_SPACING - DOT_R * 2) / 2;
    n.children.forEach((c) => {
      const placedChild = ctx.persons.find(
        (p) => p.slug === c.slug && !p.isSpouse,
      );
      if (placedChild) {
        ctx.childEdges.push({
          from: { x: fromX, y: fromY },
          to: { x: placedChild.x, y: placedChild.y - DOT_R },
          busY,
        });
      }
    });
  }

  return { centerX: personX, rightX: Math.max(rightX, personX + ownW / 2) };
}

export function layoutFamilyTree(roots: EnrichedTreeNode[]): LaidOutChart {
  const ctx: PlacementCtx = {
    persons: [],
    spouseEdges: [],
    childEdges: [],
  };
  let cursor = PADDING;
  roots.forEach((r) => {
    const placed = placeSubtree(r, cursor, 0, ctx);
    cursor = placed.rightX + H_SPACING;
  });

  const maxX = ctx.persons.reduce((acc, p) => Math.max(acc, p.x + DOT_R), 0);
  const maxY = ctx.persons.reduce((acc, p) => Math.max(acc, p.y + DOT_R), 0);
  return {
    persons: ctx.persons,
    spouseEdges: ctx.spouseEdges,
    childEdges: ctx.childEdges,
    bounds: {
      width: maxX + PADDING,
      height: maxY + PADDING,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun run test lib/family-tree-layout.test.ts
```

Expected: all 7 cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/family-tree-layout.ts lib/family-tree-layout.test.ts
git commit -m "$(cat <<'EOF'
TKW: `layoutFamilyTree` computes top-down chart geometry

- pure function: enriched tree in, `LaidOutChart` out (persons, spouseEdges, childEdges, bounds)
- subtree-width pass + top-down x assignment, depth-driven y
- spouse pairs treated as a wider sibling-packing unit
- child edges descend from the person-spouse midpoint
EOF
)"
```

---

## Task 4: `FamilyTreeChart` base rendering (no interaction)

**Files:**

- Create: `components/FamilyTreeChart/FamilyTreeChart.tsx`
- Create: `components/FamilyTreeChart/FamilyTreeChart.module.scss`
- Create: `components/FamilyTreeChart/FamilyTreeChart.test.tsx`
- Create: `components/FamilyTreeChart/index.ts`

This task gets the SVG rendering correct and locked in; pan/zoom and controls follow in later tasks.

- [ ] **Step 1: Write the failing rendering tests**

Create `components/FamilyTreeChart/FamilyTreeChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilyTreeChart } from "@/components/FamilyTreeChart";
import type { LaidOutChart, LayoutPerson } from "@/lib/family-tree-layout";

function person(overrides: Partial<LayoutPerson> = {}): LayoutPerson {
  return {
    slug: "p",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    portrait: null,
    titles: [],
    born: null,
    died: null,
    x: 50,
    y: 50,
    isSpouse: false,
    ...overrides,
  };
}

const EMPTY: LaidOutChart = {
  persons: [],
  spouseEdges: [],
  childEdges: [],
  bounds: { width: 60, height: 60 },
};

describe("FamilyTreeChart — rendering", () => {
  it("renders one circle per person, including spouses", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "a", name: "Ann Stark" }),
        person({ slug: "b", name: "Bob Stark", isSpouse: true, x: 100 }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("circle[data-person]").length).toBe(2);
  });

  it('renders the label as "First L." for two-word names', () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "es", name: "Eddard Stark" })],
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByText("Eddard S.")).toBeDefined();
  });

  it("renders the label as just the first word for single-word names", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "varys", name: "Varys" })],
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByText("Varys")).toBeDefined();
  });

  it("renders a <title> with the full name (and alias if present)", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "es", name: "Eddard Stark", alias: "Ned" })],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const titles = Array.from(container.querySelectorAll("title")).map(
      (t) => t.textContent,
    );
    expect(titles).toContain("Eddard Stark (Ned)");
  });

  it("renders an <image> when portrait is non-null and none when null", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({
          slug: "with",
          name: "With Portrait",
          portrait: "/characters/with.png",
        }),
        person({
          slug: "without",
          name: "Without Portrait",
          portrait: null,
          x: 100,
        }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("image").length).toBe(1);
  });

  it("wraps non-placeholder, non-external persons in <a href> using trailing-slash URL", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [person({ slug: "eddard", name: "Eddard Stark" })],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const a = container.querySelector("a[href]");
    expect(a?.getAttribute("href")).toBe("/characters/eddard/");
  });

  it("does not wrap placeholders in an anchor", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "phantom", name: "Phantom", placeholder: true }),
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelector("a[href]")).toBeNull();
  });

  it("renders the empty-state message when there are no persons", () => {
    render(<FamilyTreeChart chart={EMPTY} />);
    expect(
      screen.getByText(/no members of this house have yet been recorded/i),
    ).toBeDefined();
  });

  it("renders a child connector path per child edge", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "p", x: 100, y: 50 }),
        person({ slug: "c", x: 100, y: 150 }),
      ],
      childEdges: [
        { from: { x: 100, y: 64 }, to: { x: 100, y: 136 }, busY: 100 },
      ],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("path[data-child-edge]").length).toBe(1);
  });

  it("renders ⚭ glyph and second circle for each spouse edge", () => {
    const chart: LaidOutChart = {
      ...EMPTY,
      persons: [
        person({ slug: "p", name: "Person", x: 50 }),
        person({ slug: "sp", name: "Spouse", isSpouse: true, x: 100 }),
      ],
      spouseEdges: [{ personSlug: "p", spouseSlug: "sp" }],
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    expect(container.querySelectorAll("text[data-cross]").length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: module not found.

- [ ] **Step 3: Create the index barrel**

Create `components/FamilyTreeChart/index.ts`:

```ts
export * from "@/components/FamilyTreeChart/FamilyTreeChart";
```

- [ ] **Step 4: Add SCSS module**

Create `components/FamilyTreeChart/FamilyTreeChart.module.scss`:

```scss
.container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid rgba(107, 68, 35, 0.25);
  border-radius: 2px;
  background: rgba(248, 236, 208, 0.45);
  touch-action: none;
  user-select: none;
}

.svg {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;

  &.dragging {
    cursor: grabbing;
  }
}

.dot {
  fill: rgba(248, 236, 208, 0.85);
  stroke: rgba(107, 68, 35, 0.6);
  stroke-width: 1.5;
}

.dotPlaceholder {
  stroke-dasharray: 3 2;
  opacity: 0.7;
}

.dotExternal {
  opacity: 0.55;
}

.label {
  font-family: var(--font-ui);
  font-size: 9px;
  fill: var(--ink-faded);
  text-anchor: middle;
  pointer-events: none;
}

.cross {
  font-family: var(--font-body);
  font-size: 10px;
  fill: var(--gold-leaf);
  text-anchor: middle;
  pointer-events: none;
}

.edge {
  stroke: rgba(107, 68, 35, 0.5);
  stroke-width: 1;
  fill: none;
}

.empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-style: italic;
  color: var(--ink-faded);
  padding: 2rem 1rem;
  text-align: center;
}
```

- [ ] **Step 5: Implement the chart component**

Create `components/FamilyTreeChart/FamilyTreeChart.tsx`:

```tsx
"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";
import {
  LAYOUT_CONSTANTS,
  type LaidOutChart,
  type LayoutPerson,
} from "@/lib/family-tree-layout";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;
const LABEL_GAP = 8;

function formatLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

function formatTitle(person: LayoutPerson): string {
  return person.alias ? `${person.name} (${person.alias})` : person.name;
}

function dotClassName(p: LayoutPerson): string {
  return cx(
    styles.dot,
    p.placeholder && styles.dotPlaceholder,
    p.external && styles.dotExternal,
  );
}

function isLinkable(p: LayoutPerson): boolean {
  return !p.placeholder && !p.external && !p.isSpouse;
}

function childPath(edge: LaidOutChart["childEdges"][number]): string {
  const { from, to, busY } = edge;
  return `M ${from.x} ${from.y} V ${busY} H ${to.x} V ${to.y}`;
}

type Props = {
  chart: LaidOutChart;
};

export function FamilyTreeChart({ chart }: Props) {
  const clipPrefix = useId();

  if (chart.persons.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          No members of this house have yet been recorded.
        </p>
      </div>
    );
  }

  const { bounds } = chart;

  return (
    <div className={styles.container}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Family tree chart"
      >
        <defs>
          {chart.persons
            .filter((p) => p.portrait !== null)
            .map((p) => (
              <clipPath
                id={`${clipPrefix}-clip-${p.slug}`}
                key={`${clipPrefix}-clip-${p.slug}`}
              >
                <circle cx={p.x} cy={p.y} r={DOT_R - 1} />
              </clipPath>
            ))}
        </defs>
        <g>
          {chart.childEdges.map((edge, i) => (
            <path
              key={`edge-${i}`}
              data-child-edge
              className={styles.edge}
              d={childPath(edge)}
            />
          ))}
          {chart.spouseEdges.map((edge, i) => {
            const personA = chart.persons.find(
              (p) => p.slug === edge.personSlug && !p.isSpouse,
            );
            const personB = chart.persons.find(
              (p) => p.slug === edge.spouseSlug && p.isSpouse,
            );
            if (!personA || !personB) return null;
            const midX = (personA.x + personB.x) / 2;
            return (
              <text
                key={`cross-${i}`}
                data-cross
                className={styles.cross}
                x={midX}
                y={personA.y + 3}
              >
                ⚭
              </text>
            );
          })}
          {chart.persons.map((p) => {
            const dotEl = (
              <>
                <circle
                  data-person
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  className={dotClassName(p)}
                />
                {p.portrait !== null && (
                  <image
                    href={p.portrait}
                    x={p.x - DOT_R}
                    y={p.y - DOT_R}
                    width={DOT_R * 2}
                    height={DOT_R * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipPrefix}-clip-${p.slug})`}
                  />
                )}
              </>
            );
            const label = (
              <text
                className={styles.label}
                x={p.x}
                y={p.y - DOT_R - LABEL_GAP}
              >
                {formatLabel(p.name)}
              </text>
            );
            const title = <title>{formatTitle(p)}</title>;
            const key = `${p.slug}-${p.isSpouse ? "s" : "n"}`;
            if (isLinkable(p)) {
              return (
                <a key={key} href={`/characters/${p.slug}/`}>
                  {title}
                  {dotEl}
                  {label}
                </a>
              );
            }
            return (
              <g key={key}>
                {title}
                {dotEl}
                {label}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: all 10 rendering tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/FamilyTreeChart/
git commit -m "$(cat <<'EOF'
TKW: `FamilyTreeChart` base SVG rendering

- one `<circle>` + clipped `<image>` per person, label "First L." above each
- `<title>` carries full name with alias, anchor wraps linkable persons
- spouse `⚭` glyph at pair midpoint, orthogonal `<path>` connectors per child edge
- empty-state message matches the list view's
EOF
)"
```

---

## Task 5: Pan interaction

**Files:**

- Modify: `components/FamilyTreeChart/FamilyTreeChart.tsx`
- Modify: `components/FamilyTreeChart/FamilyTreeChart.test.tsx`

- [ ] **Step 1: Write the failing pan test**

Append to `components/FamilyTreeChart/FamilyTreeChart.test.tsx`:

```tsx
describe("FamilyTreeChart — pan", () => {
  function chartWith(persons: LayoutPerson[]): LaidOutChart {
    return {
      persons,
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
  }

  it("translates the inner <g> when the user drags the SVG", () => {
    const chart = chartWith([person({ slug: "a", x: 100, y: 100 })]);
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;
    const before = inner.getAttribute("transform") ?? "";

    svg.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 50,
        clientY: 50,
        bubbles: true,
      }),
    );
    svg.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 1,
        clientX: 130,
        clientY: 90,
        bubbles: true,
      }),
    );
    svg.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 1,
        clientX: 130,
        clientY: 90,
        bubbles: true,
      }),
    );

    const after = inner.getAttribute("transform") ?? "";
    expect(after).not.toBe(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: failure — no `data-pan-root` group and no pointer handlers wired.

- [ ] **Step 3: Add pan state and handlers**

Replace the entire contents of `components/FamilyTreeChart/FamilyTreeChart.tsx` with:

```tsx
"use client";

import { useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import {
  LAYOUT_CONSTANTS,
  type LaidOutChart,
  type LayoutPerson,
} from "@/lib/family-tree-layout";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;
const LABEL_GAP = 8;

function formatLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

function formatTitle(person: LayoutPerson): string {
  return person.alias ? `${person.name} (${person.alias})` : person.name;
}

function dotClassName(p: LayoutPerson): string {
  return cx(
    styles.dot,
    p.placeholder && styles.dotPlaceholder,
    p.external && styles.dotExternal,
  );
}

function isLinkable(p: LayoutPerson): boolean {
  return !p.placeholder && !p.external && !p.isSpouse;
}

function childPath(edge: LaidOutChart["childEdges"][number]): string {
  const { from, to, busY } = edge;
  return `M ${from.x} ${from.y} V ${busY} H ${to.x} V ${to.y}`;
}

type Transform = { scale: number; tx: number; ty: number };

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTx: number;
  startTy: number;
};

type Props = {
  chart: LaidOutChart;
};

export function FamilyTreeChart({ chart }: Props) {
  const clipPrefix = useId();
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    tx: 0,
    ty: 0,
  });
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (chart.persons.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          No members of this house have yet been recorded.
        </p>
      </div>
    );
  }

  const { bounds } = chart;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: transform.tx,
      startTy: transform.ty,
    };
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setTransform((t) => ({
      ...t,
      tx: d.startTx + (e.clientX - d.startClientX),
      ty: d.startTy + (e.clientY - d.startClientY),
    }));
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className={styles.container}>
      <svg
        className={cx(styles.svg, isDragging && styles.dragging)}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Family tree chart"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          {chart.persons
            .filter((p) => p.portrait !== null)
            .map((p) => (
              <clipPath
                id={`${clipPrefix}-clip-${p.slug}`}
                key={`${clipPrefix}-clip-${p.slug}`}
              >
                <circle cx={p.x} cy={p.y} r={DOT_R - 1} />
              </clipPath>
            ))}
        </defs>
        <g
          data-pan-root
          transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
        >
          {chart.childEdges.map((edge, i) => (
            <path
              key={`edge-${i}`}
              data-child-edge
              className={styles.edge}
              d={childPath(edge)}
            />
          ))}
          {chart.spouseEdges.map((edge, i) => {
            const personA = chart.persons.find(
              (p) => p.slug === edge.personSlug && !p.isSpouse,
            );
            const personB = chart.persons.find(
              (p) => p.slug === edge.spouseSlug && p.isSpouse,
            );
            if (!personA || !personB) return null;
            const midX = (personA.x + personB.x) / 2;
            return (
              <text
                key={`cross-${i}`}
                data-cross
                className={styles.cross}
                x={midX}
                y={personA.y + 3}
              >
                ⚭
              </text>
            );
          })}
          {chart.persons.map((p) => {
            const dotEl = (
              <>
                <circle
                  data-person
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  className={dotClassName(p)}
                />
                {p.portrait !== null && (
                  <image
                    href={p.portrait}
                    x={p.x - DOT_R}
                    y={p.y - DOT_R}
                    width={DOT_R * 2}
                    height={DOT_R * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipPrefix}-clip-${p.slug})`}
                  />
                )}
              </>
            );
            const label = (
              <text
                className={styles.label}
                x={p.x}
                y={p.y - DOT_R - LABEL_GAP}
              >
                {formatLabel(p.name)}
              </text>
            );
            const title = <title>{formatTitle(p)}</title>;
            const key = `${p.slug}-${p.isSpouse ? "s" : "n"}`;
            if (isLinkable(p)) {
              return (
                <a key={key} href={`/characters/${p.slug}/`}>
                  {title}
                  {dotEl}
                  {label}
                </a>
              );
            }
            return (
              <g key={key}>
                {title}
                {dotEl}
                {label}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: all rendering tests still pass; the new pan test passes.

- [ ] **Step 5: Commit**

```bash
git add components/FamilyTreeChart/
git commit -m "$(cat <<'EOF'
TKW: pan the family tree chart by drag

- pointer-driven drag updates the inner `<g>` `transform`
- `pointer-capture` keeps the gesture even if the cursor leaves the SVG
- `grab` / `grabbing` cursor reflects drag state
EOF
)"
```

---

## Task 6: Wheel zoom (cursor-anchored)

**Files:**

- Modify: `components/FamilyTreeChart/FamilyTreeChart.tsx`
- Modify: `components/FamilyTreeChart/FamilyTreeChart.test.tsx`

- [ ] **Step 1: Write the failing wheel-zoom test**

Append to `components/FamilyTreeChart/FamilyTreeChart.test.tsx`:

```tsx
describe("FamilyTreeChart — wheel zoom", () => {
  it("increases scale on negative deltaY", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 100, y: 100 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;
    const initial = inner.getAttribute("transform") ?? "";
    svg.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -500,
        clientX: 200,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      }),
    );
    const after = inner.getAttribute("transform") ?? "";
    const matchInitial = initial.match(/scale\(([0-9.]+)\)/);
    const matchAfter = after.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(matchAfter![1])).toBeGreaterThan(
      parseFloat(matchInitial![1]),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: failure — wheel handler not wired, scale stays at 1.

- [ ] **Step 3: Add wheel-zoom logic**

In `components/FamilyTreeChart/FamilyTreeChart.tsx`, add these constants near the top, after `LABEL_GAP`:

```tsx
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const WHEEL_SENSITIVITY = 0.0015;
```

Add this helper just below `dotClassName`:

```tsx
function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function zoomAtPoint(
  current: Transform,
  newScale: number,
  anchorX: number,
  anchorY: number,
): Transform {
  const px = (anchorX - current.tx) / current.scale;
  const py = (anchorY - current.ty) / current.scale;
  return {
    scale: newScale,
    tx: anchorX - px * newScale,
    ty: anchorY - py * newScale,
  };
}
```

Inside `FamilyTreeChart`, add a `svgRef` ref:

```tsx
const svgRef = useRef<SVGSVGElement | null>(null);
```

Add a `useEffect` that registers a non-passive wheel listener (since React's default is passive and we need `preventDefault`). Place it just below the `useState` for `transform`:

```tsx
useEffect(() => {
  const svg = svgRef.current;
  if (!svg) return;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const anchorX = e.clientX - rect.left;
    const anchorY = e.clientY - rect.top;
    setTransform((t) => {
      const factor = 1 - e.deltaY * WHEEL_SENSITIVITY;
      const next = clampScale(t.scale * factor);
      if (next === t.scale) return t;
      const viewBoxX = (anchorX / rect.width) * bounds.width;
      const viewBoxY = (anchorY / rect.height) * bounds.height;
      return zoomAtPoint(t, next, viewBoxX, viewBoxY);
    });
  };
  svg.addEventListener("wheel", onWheel, { passive: false });
  return () => svg.removeEventListener("wheel", onWheel);
}, [bounds.width, bounds.height]);
```

Add the import:

```tsx
import { useEffect, useId, useRef, useState } from "react";
```

And attach the ref to the `<svg>`:

```tsx
<svg
  ref={svgRef}
  className={...
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: all prior tests pass; the new wheel test passes.

- [ ] **Step 5: Commit**

```bash
git add components/FamilyTreeChart/
git commit -m "$(cat <<'EOF'
TKW: cursor-anchored wheel zoom on the family tree chart

- `wheel` listener with `passive: false` so `preventDefault` keeps the page from scrolling
- zoom anchored on the pointer position in viewBox coords via `zoomAtPoint`
- scale clamped to `[MIN_SCALE, MAX_SCALE]`
EOF
)"
```

---

## Task 7: Pinch zoom (two-finger)

**Files:**

- Modify: `components/FamilyTreeChart/FamilyTreeChart.tsx`
- Modify: `components/FamilyTreeChart/FamilyTreeChart.test.tsx`

- [ ] **Step 1: Write the failing pinch test**

Append to `components/FamilyTreeChart/FamilyTreeChart.test.tsx`:

```tsx
describe("FamilyTreeChart — pinch zoom", () => {
  function dispatch(svg: SVGSVGElement, type: string, opts: PointerEventInit) {
    svg.dispatchEvent(new PointerEvent(type, { bubbles: true, ...opts }));
  }

  it("scales when two pointers spread apart", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 100, y: 100 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    const svg = container.querySelector("svg")!;
    const inner = svg.querySelector("g[data-pan-root]") as SVGGElement;

    dispatch(svg, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 100,
      clientY: 100,
    });
    dispatch(svg, "pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 100,
    });
    dispatch(svg, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 50,
      clientY: 100,
    });
    dispatch(svg, "pointermove", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 250,
      clientY: 100,
    });

    const transform = inner.getAttribute("transform") ?? "";
    const match = transform.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(match![1])).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: failure — second pointer is ignored.

- [ ] **Step 3: Add pinch state and handlers**

In `components/FamilyTreeChart/FamilyTreeChart.tsx`, extend the `DragState` block and add a pinch state:

Replace this:

```tsx
const dragRef = useRef<DragState | null>(null);
```

with:

```tsx
type Pointer = { x: number; y: number };
type PinchState = {
  startDistance: number;
  startScale: number;
  startTx: number;
  startTy: number;
  anchorViewBoxX: number;
  anchorViewBoxY: number;
};

const dragRef = useRef<DragState | null>(null);
const pointersRef = useRef<Map<number, Pointer>>(new Map());
const pinchRef = useRef<PinchState | null>(null);
```

Add this helper near the other helpers at the top of the file (outside the component):

```tsx
function pointerListToArray(map: Map<number, Pointer>): Pointer[] {
  return Array.from(map.values());
}

function distance(a: Pointer, b: Pointer): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Pointer, b: Pointer): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
```

Replace `onPointerDown` with:

```tsx
const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointersRef.current.size === 1) {
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTx: transform.tx,
      startTy: transform.ty,
    };
    setIsDragging(true);
  } else if (pointersRef.current.size === 2 && svgRef.current) {
    const [a, b] = pointerListToArray(pointersRef.current);
    const m = midpoint(a, b);
    const rect = svgRef.current.getBoundingClientRect();
    pinchRef.current = {
      startDistance: distance(a, b),
      startScale: transform.scale,
      startTx: transform.tx,
      startTy: transform.ty,
      anchorViewBoxX: ((m.x - rect.left) / rect.width) * bounds.width,
      anchorViewBoxY: ((m.y - rect.top) / rect.height) * bounds.height,
    };
    dragRef.current = null;
    setIsDragging(false);
  }
};
```

Replace `onPointerMove` with:

```tsx
const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
  const stored = pointersRef.current.get(e.pointerId);
  if (!stored) return;
  pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

  const pinch = pinchRef.current;
  if (pinch && pointersRef.current.size === 2) {
    const [a, b] = pointerListToArray(pointersRef.current);
    const ratio = distance(a, b) / pinch.startDistance;
    const nextScale = clampScale(pinch.startScale * ratio);
    setTransform(() =>
      zoomAtPoint(
        {
          scale: pinch.startScale,
          tx: pinch.startTx,
          ty: pinch.startTy,
        },
        nextScale,
        pinch.anchorViewBoxX,
        pinch.anchorViewBoxY,
      ),
    );
    return;
  }

  const d = dragRef.current;
  if (!d || d.pointerId !== e.pointerId) return;
  setTransform((t) => ({
    ...t,
    tx: d.startTx + (e.clientX - d.startClientX),
    ty: d.startTy + (e.clientY - d.startClientY),
  }));
};
```

Replace `endDrag` with:

```tsx
const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
  pointersRef.current.delete(e.pointerId);
  if (pointersRef.current.size < 2) pinchRef.current = null;
  if (pointersRef.current.size === 1) {
    const [remaining] = pointerListToArray(pointersRef.current);
    dragRef.current = {
      pointerId: Array.from(pointersRef.current.keys())[0],
      startClientX: remaining.x,
      startClientY: remaining.y,
      startTx: transform.tx,
      startTy: transform.ty,
    };
    setIsDragging(true);
    return;
  }
  dragRef.current = null;
  setIsDragging(false);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: all prior tests pass; the pinch test passes.

- [ ] **Step 5: Commit**

```bash
git add components/FamilyTreeChart/
git commit -m "$(cat <<'EOF'
TKW: two-finger pinch zoom on the family tree chart

- track active pointers in a `Map`; second pointer starts pinch
- scale ratio relative to the initial finger distance, anchored on the pinch midpoint
- gracefully degrades back to single-finger pan when one finger lifts
EOF
)"
```

---

## Task 8: Control panel + animated button zooms + Reset

**Files:**

- Modify: `components/FamilyTreeChart/FamilyTreeChart.tsx`
- Modify: `components/FamilyTreeChart/FamilyTreeChart.module.scss`
- Modify: `components/FamilyTreeChart/FamilyTreeChart.test.tsx`

- [ ] **Step 1: Write the failing control-panel tests**

Append to `components/FamilyTreeChart/FamilyTreeChart.test.tsx`:

```tsx
describe("FamilyTreeChart — control panel", () => {
  it("renders zoom in, zoom out, four presets, and reset buttons", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    render(<FamilyTreeChart chart={chart} />);
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /25%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /50%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /100%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /200%/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDefined();
  });

  it("clicking 200% sets the scale on the inner <g> to 2", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /200%/ }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    const transform = inner.getAttribute("transform") ?? "";
    expect(transform).toMatch(/scale\(2(\.0+)?\)/);
  });

  it("clicking 100% sets scale to 1 and marks the preset as pressed", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /200%/ }));
    fireEvent.click(screen.getByRole("button", { name: /100%/ }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    expect(inner.getAttribute("transform")).toMatch(/scale\(1(\.0+)?\)/);
    expect(
      screen.getByRole("button", { name: /100%/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("clicking + increases scale by the button step factor", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    const m = inner.getAttribute("transform")!.match(/scale\(([0-9.]+)\)/);
    expect(parseFloat(m![1])).toBeCloseTo(1.25, 2);
  });

  it("clicking reset restores scale to 1 after zooming", () => {
    const chart: LaidOutChart = {
      persons: [person({ slug: "a", x: 50, y: 50 })],
      spouseEdges: [],
      childEdges: [],
      bounds: { width: 400, height: 300 },
    };
    const { container } = render(<FamilyTreeChart chart={chart} />);
    fireEvent.click(screen.getByRole("button", { name: /200%/ }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    const inner = container.querySelector("g[data-pan-root]") as SVGGElement;
    expect(inner.getAttribute("transform")).toMatch(/scale\(1(\.0+)?\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: failure — no control buttons exist.

- [ ] **Step 3: Add control panel styles**

Append to `components/FamilyTreeChart/FamilyTreeChart.module.scss`:

```scss
.controls {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  display: grid;
  gap: 0.25rem;
  padding: 0.4rem;
  background: rgba(248, 236, 208, 0.92);
  border: 1px solid rgba(107, 68, 35, 0.35);
  border-radius: 2px;
  font-family: var(--font-ui);
  z-index: 1;
}

.controlRow {
  display: flex;
  gap: 0.2rem;
  justify-content: center;
}

.controlButton {
  appearance: none;
  background: transparent;
  border: 1px solid rgba(107, 68, 35, 0.25);
  border-radius: 2px;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  min-width: 1.5rem;
  color: var(--ink-faded);
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;

  &:hover,
  &:focus-visible {
    color: var(--gold-leaf);
    background: rgba(212, 162, 89, 0.18);
    outline: none;
  }

  &[aria-pressed="true"] {
    color: var(--ink);
    background: rgba(212, 162, 89, 0.28);
    border-color: rgba(212, 162, 89, 0.55);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}

.controlReset {
  width: 100%;
}
```

- [ ] **Step 4: Add the control logic and JSX**

In `components/FamilyTreeChart/FamilyTreeChart.tsx`, add these constants near the other zoom constants:

```tsx
const BUTTON_STEP = 1.25;
const PRESET_SCALES = [0.25, 0.5, 1, 2] as const;
const SCALE_EPSILON = 0.001;
const ANIM_MS = 200;
```

Add this helper near the other module-level helpers:

```tsx
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

Inside the component, just below the existing `useState`s, add an animation ref and reduced-motion state:

```tsx
const animationRef = useRef<number | null>(null);
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

useEffect(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  setPrefersReducedMotion(mql.matches);
  const handler = (e: MediaQueryListEvent) =>
    setPrefersReducedMotion(e.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, []);
```

Add this animation helper inside the component (above the `onPointerDown`):

```tsx
const animateTo = (target: Transform) => {
  if (animationRef.current !== null) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }
  if (prefersReducedMotion || typeof window === "undefined") {
    setTransform(target);
    return;
  }
  const start = performance.now();
  const from = transform;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ANIM_MS);
    const e = easeOutCubic(t);
    setTransform({
      scale: from.scale + (target.scale - from.scale) * e,
      tx: from.tx + (target.tx - from.tx) * e,
      ty: from.ty + (target.ty - from.ty) * e,
    });
    if (t < 1) {
      animationRef.current = requestAnimationFrame(tick);
    } else {
      animationRef.current = null;
    }
  };
  animationRef.current = requestAnimationFrame(tick);
};
```

Add the box-center zoom helpers inside the component:

```tsx
const boxCenter = () => ({
  x: bounds.width / 2,
  y: bounds.height / 2,
});

const zoomBy = (factor: number) => {
  const c = boxCenter();
  const next = clampScale(transform.scale * factor);
  animateTo(zoomAtPoint(transform, next, c.x, c.y));
};

const zoomTo = (scale: number) => {
  const c = boxCenter();
  animateTo(zoomAtPoint(transform, clampScale(scale), c.x, c.y));
};

const reset = () => {
  animateTo({ scale: 1, tx: 0, ty: 0 });
};
```

Just before the closing `</div>` of the outer container, add the control panel:

```tsx
<div className={styles.controls} role="group" aria-label="Chart controls">
  <div className={styles.controlRow}>
    <button
      type="button"
      className={styles.controlButton}
      aria-label="Zoom in"
      onClick={() => zoomBy(BUTTON_STEP)}
    >
      +
    </button>
    <button
      type="button"
      className={styles.controlButton}
      aria-label="Zoom out"
      onClick={() => zoomBy(1 / BUTTON_STEP)}
    >
      −
    </button>
  </div>
  <div className={styles.controlRow}>
    {PRESET_SCALES.map((preset) => (
      <button
        key={preset}
        type="button"
        className={styles.controlButton}
        aria-label={`Zoom to ${Math.round(preset * 100)}%`}
        aria-pressed={Math.abs(transform.scale - preset) < SCALE_EPSILON}
        onClick={() => zoomTo(preset)}
      >
        {Math.round(preset * 100)}%
      </button>
    ))}
  </div>
  <button
    type="button"
    className={cx(styles.controlButton, styles.controlReset)}
    aria-label="Reset zoom"
    onClick={reset}
  >
    ⟲ Reset
  </button>
</div>
```

Make sure the `import { fireEvent ... }` line in the test file includes `fireEvent` (it should already; if you accidentally removed it, restore it).

- [ ] **Step 5: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeChart/FamilyTreeChart.test.tsx
```

Expected: all rendering, pan, wheel, pinch, and control-panel tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/FamilyTreeChart/
git commit -m "$(cat <<'EOF'
TKW: control panel for the family tree chart

- `+` / `−` step zoom by 1.25× / 0.8×, anchored on the box centre
- preset buttons `25 / 50 / 100 / 200` set absolute scale, with `aria-pressed` on the active preset
- Reset returns to `scale: 1, tx: 0, ty: 0`
- button-driven zooms animate via `requestAnimationFrame` with ease-out cubic
- `prefers-reduced-motion: reduce` short-circuits the animation
EOF
)"
```

---

## Task 9: `FamilyTreeViewSwitcher` + URL state

**Files:**

- Create: `components/FamilyTreeViews/FamilyTreeViews.tsx`
- Create: `components/FamilyTreeViews/FamilyTreeViewSwitcher.tsx`
- Create: `components/FamilyTreeViews/FamilyTreeViews.module.scss`
- Create: `components/FamilyTreeViews/FamilyTreeViews.test.tsx`
- Create: `components/FamilyTreeViews/index.ts`

- [ ] **Step 1: Write the failing switcher tests**

Create `components/FamilyTreeViews/FamilyTreeViews.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FamilyTreeViewSwitcher } from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";

function hiddenAttr(el: HTMLElement | null): string | null {
  return el ? el.getAttribute("hidden") : null;
}

function setUrl(search: string) {
  window.history.replaceState(null, "", `/houses/stark/${search}`);
}

describe("FamilyTreeViewSwitcher", () => {
  beforeEach(() => {
    setUrl("");
  });

  afterEach(() => {
    setUrl("");
  });

  it("shows the list view child by default", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
    expect(
      hiddenAttr(screen.getByTestId("chart").parentElement),
    ).not.toBeNull();
  });

  it("shows the chart view when ?tree=chart", () => {
    setUrl("?tree=chart");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("chart").parentElement)).toBeNull();
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).not.toBeNull();
  });

  it("falls back to the list view when ?tree is invalid", () => {
    setUrl("?tree=bogus");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
  });

  it("clicking the chart toggle button writes ?tree=chart to the URL", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chart view/i }));
    expect(window.location.search).toBe("?tree=chart");
  });

  it("clicking the list toggle button strips ?tree from the URL", () => {
    setUrl("?tree=chart");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(window.location.search).toBe("");
  });

  it("re-renders when the URL changes externally", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    setUrl("?tree=chart");
    window.dispatchEvent(new Event("tkw:urlchange"));
    expect(hiddenAttr(screen.getByTestId("chart").parentElement)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun run test components/FamilyTreeViews/FamilyTreeViews.test.tsx
```

Expected: module not found.

- [ ] **Step 3: Implement the switcher component**

Create `components/FamilyTreeViews/FamilyTreeViews.module.scss`:

```scss
.heading {
  display: grid;
  grid-template-areas: "title toggle";
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0 0 0.5rem 0;
}

.title {
  grid-area: title;
  margin: 0;
}

.toggle {
  grid-area: toggle;
}
```

Create `components/FamilyTreeViews/FamilyTreeViewSwitcher.tsx`:

```tsx
"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ViewToggle, ListIcon, TreeChartIcon } from "@/components/ViewToggle";
import {
  getServerSnapshot,
  readUrlSearch,
  subscribeToUrlChange,
  writeUrlParam,
} from "@/lib/listUrlState";
import styles from "@/components/FamilyTreeViews/FamilyTreeViews.module.scss";

export type TreeViewMode = "list" | "chart";

const TREE_PARAM = "tree";
const DEFAULT_MODE: TreeViewMode = "list";

const VIEW_OPTIONS = [
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
  { value: "chart" as const, label: "Chart view", icon: <TreeChartIcon /> },
];

function parseMode(search: string): TreeViewMode {
  const value = new URLSearchParams(search).get(TREE_PARAM);
  return value === "chart" ? "chart" : "list";
}

type Props = {
  list: ReactNode;
  chart: ReactNode;
  headingId?: string;
};

export function FamilyTreeViewSwitcher({ list, chart, headingId }: Props) {
  const urlSnapshot = useSyncExternalStore(
    subscribeToUrlChange,
    readUrlSearch,
    getServerSnapshot,
  );
  const mode = useMemo(() => parseMode(urlSnapshot), [urlSnapshot]);

  const onModeChange = (next: TreeViewMode) => {
    writeUrlParam({
      name: TREE_PARAM,
      value: next,
      defaultValue: DEFAULT_MODE,
    });
  };

  return (
    <>
      <div className={styles.heading}>
        <h2 className={styles.title} id={headingId}>
          Family Tree
        </h2>
        <div className={styles.toggle}>
          <ViewToggle
            options={VIEW_OPTIONS}
            value={mode}
            onChange={onModeChange}
            ariaLabel="Family tree view"
          />
        </div>
      </div>
      <div hidden={mode !== "list"}>{list}</div>
      <div hidden={mode !== "chart"}>{chart}</div>
    </>
  );
}
```

Because `writeUrlParam` deletes the param when `value === defaultValue`, clicking the `list` button (the default) automatically strips `?tree` from the URL — no special case needed.

Create `components/FamilyTreeViews/FamilyTreeViews.tsx`:

```tsx
import type { TreeNode } from "@/lib/family-tree";
import type { LaidOutChart } from "@/lib/family-tree-layout";
import { FamilyTree } from "@/components/FamilyTree";
import { FamilyTreeChart } from "@/components/FamilyTreeChart";
import { FamilyTreeViewSwitcher } from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";

type Props = {
  roots: TreeNode[];
  chart: LaidOutChart;
  headingId?: string;
};

export function FamilyTreeViews({ roots, chart, headingId }: Props) {
  return (
    <FamilyTreeViewSwitcher
      headingId={headingId}
      list={<FamilyTree roots={roots} />}
      chart={<FamilyTreeChart chart={chart} />}
    />
  );
}
```

Create `components/FamilyTreeViews/index.ts`:

```ts
export * from "@/components/FamilyTreeViews/FamilyTreeViews";
export * from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun run test components/FamilyTreeViews/FamilyTreeViews.test.tsx
```

Expected: all 5 switcher tests pass.

- [ ] **Step 5: Run the whole suite**

```bash
bun run test
```

Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add components/FamilyTreeViews/
git commit -m "$(cat <<'EOF'
TKW: `FamilyTreeViews` toggles list and chart via `?tree=`

- `FamilyTreeViewSwitcher` reads `useSearchParams`, writes `router.replace` with `scroll: false`
- `tree=chart` shows the chart, anything else falls back to list (default)
- heading row uses `grid-template-areas: "title toggle"` per repo grid-area rule
EOF
)"
```

---

## Task 10: Wire `FamilyTreeViews` into the house page

**Files:**

- Modify: `app/houses/[slug]/page.tsx`

- [ ] **Step 1: Update imports and data plumbing**

Open `app/houses/[slug]/page.tsx`.

Replace this import line:

```tsx
import { FamilyTree } from "@/components/FamilyTree";
```

with:

```tsx
import { FamilyTreeViews } from "@/components/FamilyTreeViews";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import { layoutFamilyTree } from "@/lib/family-tree-layout";
import { findPortrait } from "@/lib/portraits";
```

Find the line that builds the tree:

```tsx
const tree = buildFamilyTree(slug, characters);
```

Replace it with:

```tsx
const tree = buildFamilyTree(slug, characters);
const enriched = await enrichTreeWithPortraits(tree, findPortrait);
const chart = layoutFamilyTree(enriched);
```

Find the JSX block that renders the family tree section (around line 153):

```tsx
<section className={styles.tree} aria-labelledby="family-tree-heading">
  <h2 id="family-tree-heading">Family Tree</h2>
  <FamilyTree roots={tree} />
</section>
```

Replace it with:

```tsx
<section className={styles.tree} aria-labelledby="family-tree-heading">
  <FamilyTreeViews headingId="family-tree-heading" roots={tree} chart={chart} />
</section>
```

The notable-members branch above stays unchanged — it never showed the family tree.

- [ ] **Step 2: Run the whole test suite**

```bash
bun run test
```

Expected: full suite green.

- [ ] **Step 3: Type check and lint**

```bash
bunx tsc --noEmit
bun run lint
```

Expected: both clean.

- [ ] **Step 4: Build to confirm the static export still works**

```bash
bun run build
```

Expected: build completes without errors, including the houses static-params pass.

- [ ] **Step 5: Commit**

```bash
git add app/houses/[slug]/page.tsx
git commit -m "$(cat <<'EOF'
TKW: house page renders `FamilyTreeViews` instead of `FamilyTree`

- pipeline: `buildFamilyTree` → `enrichTreeWithPortraits(findPortrait)` → `layoutFamilyTree`
- `FamilyTreeViews` switches between the existing list and the new chart
- existing `Notable Members` branch is unchanged
EOF
)"
```

---

## Task 11: Manual verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
bun dev
```

- [ ] **Step 2: Visual check on a populous house**

Open `http://localhost:3000/houses/targaryen/` in a browser.

- Confirm the `Family Tree` heading shows a toggle on its right.
- Default view is the existing list view.
- Click the chart-view button. URL becomes `?tree=chart`.
- The SVG chart appears inside a 4:3 bounding box with a parchment border.
- Dots show portraits when available, faded plain circles when not.
- "First L." labels render above each dot.
- Hovering a dot shows the full name as a native tooltip.
- Clicking a non-placeholder dot navigates to `/characters/<slug>/`.

- [ ] **Step 3: Pan and zoom on desktop**

- Click-and-drag inside the chart pans the tree; release works.
- Mouse wheel zooms in/out anchored on the cursor.
- `+` and `−` buttons step zoom in/out, animated.
- `25 / 50 / 100 / 200` presets jump to exact scales; the matching button is highlighted.
- `Reset` returns the chart to the original transform.

- [ ] **Step 4: Pan and zoom on touch**

In Chrome DevTools, toggle device emulation (e.g. iPhone 14). Reload the page in chart mode.

- One-finger drag pans the tree.
- Two-finger pinch zooms; spread to zoom in, pinch to zoom out.
- Tapping a dot navigates (no accidental zoom).

- [ ] **Step 5: Edge cases**

- Visit a house with no recorded members (find one with `bun run` or check `content/houses/`). Confirm the empty-state message renders in both list and chart modes and the toggle still works.
- Visit `/houses/stark/?tree=garbage` and confirm the list view shows.
- Visit `/houses/stark/?tree=chart` directly and confirm the chart shows on first paint.

- [ ] **Step 6: Reduced-motion check**

In macOS System Settings → Accessibility → Display, enable `Reduce motion` (or use the Chrome devtools "Emulate CSS prefers-reduced-motion: reduce"). Reload, switch to chart mode, click `200%`. Expected: the scale jumps instantly; no animated tween.

- [ ] **Step 7: Untouched callers smoke test**

Navigate to `/houses/` and `/characters/`. Confirm the grid/list toggle still works exactly as before on both pages.

- [ ] **Step 8: Stop the dev server**

`Ctrl+C` in the terminal running `bun dev`.

- [ ] **Step 9: No code commit needed**

This task is verification-only. If any manual check fails, file a follow-up issue and patch in a separate small commit. If everything passes, the feature is complete.

---

## Self-review notes

- **Spec coverage:**
  - Polymorphic `ViewToggle` + icon extraction → Task 1.
  - `enrichTreeWithPortraits` shape and null semantics → Task 2.
  - `layoutFamilyTree` algorithm + types → Task 3.
  - SVG rendering (circles, portraits, labels, titles, anchors, spouse glyph, connector paths, empty state) → Task 4.
  - Pan via pointer events → Task 5.
  - Cursor-anchored wheel zoom → Task 6.
  - Two-finger pinch zoom → Task 7.
  - Control panel with `+ / − / 25 / 50 / 100 / 200 / Reset`, animated via rAF, reduced-motion short-circuit → Task 8.
  - URL state via `?tree=`, default list, invalid value falls back to list, switcher hides inactive view → Task 9.
  - House page wired with the new pipeline → Task 10.
  - Manual QA + static export build check → Tasks 10 (build) and 11 (manual).
- **Placeholder scan:** No "TBD", no "implement later", no "similar to Task N" cross-references. Every code-changing step shows the actual code to write.
- **Type consistency:** `Transform`, `LayoutPerson`, `LaidOutChart`, `EnrichedTreeNode`, `TreeViewMode`, `LAYOUT_CONSTANTS` names match across tasks. Helper names (`zoomAtPoint`, `clampScale`, `animateTo`, `boxCenter`, `zoomBy`, `zoomTo`, `reset`) are used consistently between tasks 6, 7, and 8. The `findPortrait` signature `(slug, sex) => Promise<string>` matches the existing `lib/portraits.ts` implementation.
- **Skipped spec items:** none. All risks called out in the spec ("Pinch on Safari iOS", "Wide trees at 25%", "Portrait load count", "SSR/CSR mismatch") are addressed structurally; they don't require additional plan tasks beyond what's already included.
