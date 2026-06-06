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
