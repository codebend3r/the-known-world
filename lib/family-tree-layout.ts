import { estimateLabelWidth } from "@/lib/family-tree-label";
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
  characterSlug: string | null;
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
  midX: number;
  midY: number;
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

function personSlotWidth(name: string, titles: ReadonlyArray<string>): number {
  return Math.max(DOT_R * 2, estimateLabelWidth(name, titles));
}

function unitWidth(n: EnrichedTreeNode): number {
  const personW = personSlotWidth(n.name, n.titles);
  const spousesW = n.spouses.reduce(
    (acc, s) => acc + SPOUSE_GAP + personSlotWidth(s.name, s.titles),
    0,
  );
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

function spousePositions(
  personX: number,
  personSlotW: number,
  spouses: ReadonlyArray<EnrichedTreeSpouse>,
): number[] {
  const positions: number[] = [];
  let cursor = personX + personSlotW / 2 + SPOUSE_GAP;
  spouses.forEach((s) => {
    const sW = personSlotWidth(s.name, s.titles);
    positions.push(cursor + sW / 2);
    cursor = cursor + sW + SPOUSE_GAP;
  });
  return positions;
}

function pairMidpoint(
  personX: number,
  spousePositionsArr: ReadonlyArray<number>,
): number {
  if (spousePositionsArr.length === 0) return personX;
  return (personX + spousePositionsArr[spousePositionsArr.length - 1]) / 2;
}

function placePerson(
  n: EnrichedTreeNode,
  isSpouse: boolean,
  x: number,
  y: number,
): LayoutPerson {
  return {
    slug: n.slug,
    characterSlug: n.placeholder ? null : n.slug,
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
    characterSlug: s.slug && !s.placeholder ? s.slug : null,
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

  const personSlotW = personSlotWidth(n.name, n.titles);
  const personX = childCenterX - ownW / 2 + personSlotW / 2;
  const person = placePerson(n, false, personX, y);
  ctx.persons.push(person);

  const sPositions = spousePositions(personX, personSlotW, n.spouses);
  n.spouses.forEach((s, i) => {
    const sX = sPositions[i];
    const identifier = `${n.slug}::spouse::${i}`;
    ctx.persons.push(placeSpouse(s, identifier, sX, y));
    const leftX = i === 0 ? personX : sPositions[i - 1];
    ctx.spouseEdges.push({
      personSlug: n.slug,
      spouseSlug: identifier,
      midX: (leftX + sX) / 2,
      midY: y,
    });
  });

  if (n.children.length > 0) {
    const fromX = pairMidpoint(personX, sPositions);
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
