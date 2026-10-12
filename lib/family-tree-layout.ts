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

export type LayoutPerson = Pick<
  EnrichedTreeNode,
  | "slug"
  | "name"
  | "alias"
  | "sex"
  | "isPlaceholder"
  | "isExternal"
  | "portrait"
  | "titles"
  | "born"
  | "died"
> & {
  characterSlug: string | null;
  x: number;
  y: number;
  isSpouse: boolean;
};

export type LayoutSpouseEdge = {
  personSlug: string;
  spouseSlug: string;
  midX: number;
  midY: number;
};

export type LayoutChildEdge = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  busY: number;
};

export type LaidOutChart = {
  persons: LayoutPerson[];
  spouseEdges: LayoutSpouseEdge[];
  childEdges: LayoutChildEdge[];
  bounds: { width: number; height: number };
};

export function childPath({ from, to, busY }: LayoutChildEdge): string {
  return `M ${from.x} ${from.y} V ${busY} H ${to.x} V ${to.y}`;
}

export function isLinkable({
  isPlaceholder,
  characterSlug,
}: {
  isPlaceholder: boolean;
  characterSlug: string | null;
}): boolean {
  return !isPlaceholder && characterSlug !== null;
}

function personSlotWidth({
  name,
  titles,
}: {
  name: string;
  titles: ReadonlyArray<string>;
}): number {
  return Math.max(DOT_R * 2, estimateLabelWidth({ name, titles }));
}

function unitWidth(n: EnrichedTreeNode): number {
  const personW = personSlotWidth(n);
  const spousesW = n.spouses.reduce(
    (acc, s) => acc + SPOUSE_GAP + personSlotWidth(s),
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

function placePerson({
  n,
  isSpouse,
  x,
  y,
}: {
  n: EnrichedTreeNode;
  isSpouse: boolean;
  x: number;
  y: number;
}): LayoutPerson {
  return {
    slug: n.slug,
    characterSlug: n.isPlaceholder ? null : n.slug,
    name: n.name,
    alias: n.alias,
    sex: n.sex,
    isPlaceholder: n.isPlaceholder,
    isExternal: n.isExternal,
    portrait: n.portrait,
    titles: n.titles,
    born: n.born,
    died: n.died,
    x,
    y,
    isSpouse,
  };
}

function placeSpouse({
  s,
  identifier,
  x,
  y,
}: {
  s: EnrichedTreeSpouse;
  identifier: string;
  x: number;
  y: number;
}): LayoutPerson {
  return {
    slug: identifier,
    characterSlug: s.slug && !s.isPlaceholder ? s.slug : null,
    name: s.name,
    alias: s.alias,
    sex: s.sex,
    isPlaceholder: s.isPlaceholder,
    isExternal: !s.isInHouse,
    portrait: s.portrait,
    titles: s.titles,
    born: null,
    died: null,
    x,
    y,
    isSpouse: true,
  };
}

type Placement = Omit<LaidOutChart, "bounds">;

type SpouseRow = Pick<Placement, "persons" | "spouseEdges"> & {
  cursor: number;
  lastX: number;
};

// Spouses line up to the right of the person, each edge joining a spouse to
// the one before. `lastX` ends on the rightmost spouse, or the person if none.
function placeSpouses({
  n,
  personX,
  personSlotW,
  y,
}: {
  n: EnrichedTreeNode;
  personX: number;
  personSlotW: number;
  y: number;
}): SpouseRow {
  return n.spouses.reduce<SpouseRow>(
    (row, s, i) => {
      const sW = personSlotWidth(s);
      const x = row.cursor + sW / 2;
      const identifier = `${n.slug}::spouse::${i}`;
      return {
        cursor: row.cursor + sW + SPOUSE_GAP,
        lastX: x,
        persons: [...row.persons, placeSpouse({ s, identifier, x, y })],
        spouseEdges: [
          ...row.spouseEdges,
          {
            personSlug: n.slug,
            spouseSlug: identifier,
            midX: (row.lastX + x) / 2,
            midY: y,
          },
        ],
      };
    },
    {
      cursor: personX + personSlotW / 2 + SPOUSE_GAP,
      lastX: personX,
      persons: [],
      spouseEdges: [],
    },
  );
}

type PlacedSubtree = Placement & { centerX: number; rightX: number };

function concatPlacements(placements: ReadonlyArray<Placement>): Placement {
  return {
    persons: placements.flatMap((p) => p.persons),
    spouseEdges: placements.flatMap((p) => p.spouseEdges),
    childEdges: placements.flatMap((p) => p.childEdges),
  };
}

function placeRow({
  nodes,
  leftX,
  depth,
}: {
  nodes: ReadonlyArray<EnrichedTreeNode>;
  leftX: number;
  depth: number;
}): PlacedSubtree[] {
  return nodes.reduce<PlacedSubtree[]>((placed, n) => {
    const previous = placed.at(-1);
    const nextLeftX = previous ? previous.rightX + H_SPACING : leftX;
    return [...placed, placeSubtree({ n, leftX: nextLeftX, depth })];
  }, []);
}

function placeSubtree({
  n,
  leftX,
  depth,
}: {
  n: EnrichedTreeNode;
  leftX: number;
  depth: number;
}): PlacedSubtree {
  const y = PADDING + DOT_R + depth * V_SPACING;
  const ownW = unitWidth(n);

  const totalChildW = n.children.reduce(
    (acc, c, i) => acc + subtreeWidth(c) + (i === 0 ? 0 : H_SPACING),
    0,
  );
  const childrenStart = Math.max(leftX, leftX + (ownW - totalChildW) / 2);
  const children = placeRow({
    nodes: n.children,
    leftX: childrenStart,
    depth: depth + 1,
  });
  const firstChild = children.at(0);
  const lastChild = children.at(-1);
  const childCenterX =
    firstChild && lastChild
      ? (firstChild.centerX + lastChild.centerX) / 2
      : leftX + ownW / 2;
  const rightX = Math.max(leftX + ownW, ...children.map((c) => c.rightX));

  const personSlotW = personSlotWidth(n);
  const personX = childCenterX - ownW / 2 + personSlotW / 2;
  const person = placePerson({ n, isSpouse: false, x: personX, y });
  const spouses = placeSpouses({ n, personX, personSlotW, y });

  const fromX = (personX + spouses.lastX) / 2;
  const fromY = y + DOT_R;
  const busY = fromY + (V_SPACING - DOT_R * 2) / 2;
  const childEdges = children.map((c) => ({
    from: { x: fromX, y: fromY },
    to: { x: c.centerX, y: y + V_SPACING - DOT_R },
    busY,
  }));

  const nested = concatPlacements(children);
  return {
    persons: [...nested.persons, person, ...spouses.persons],
    spouseEdges: [...nested.spouseEdges, ...spouses.spouseEdges],
    childEdges: [...nested.childEdges, ...childEdges],
    centerX: personX,
    rightX: Math.max(rightX, personX + ownW / 2),
  };
}

export function layoutFamilyTree(roots: EnrichedTreeNode[]): LaidOutChart {
  const { persons, spouseEdges, childEdges } = concatPlacements(
    placeRow({ nodes: roots, leftX: PADDING, depth: 0 }),
  );

  const maxX = persons.reduce((acc, p) => Math.max(acc, p.x + DOT_R), 0);
  const maxY = persons.reduce((acc, p) => Math.max(acc, p.y + DOT_R), 0);
  return {
    persons,
    spouseEdges,
    childEdges,
    bounds: {
      width: maxX + PADDING,
      height: maxY + PADDING,
    },
  };
}
