"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import {
  LAYOUT_CONSTANTS,
  type LaidOutChart,
  type LayoutPerson,
} from "@/lib/family-tree-layout";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;
const LABEL_GAP = 8;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const WHEEL_SENSITIVITY = 0.0015;

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
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { bounds } = chart;

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

  if (chart.persons.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          No members of this house have yet been recorded.
        </p>
      </div>
    );
  }

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
        ref={svgRef}
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
