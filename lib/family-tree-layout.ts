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
  identifier: string,
  x: number,
  y: number,
): LayoutPerson {
  return {
    slug: identifier,
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
    const identifier = `${n.slug}::spouse::${i}`;
    ctx.persons.push(placeSpouse(s, identifier, sX, y));
    ctx.spouseEdges.push({
      personSlug: n.slug,
      spouseSlug: identifier,
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

  return {
    centerX: personX,
    rightX: Math.max(rightX, personX + ownW / 2),
  };
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
