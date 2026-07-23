"use client";

import { type ReactNode } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { ViewToggle, ListIcon, TreeChartIcon } from "@/components/ViewToggle";
import { useIsMobile } from "@/lib/useIsMobile";
import styles from "@/components/FamilyTreeViews/FamilyTreeViews.module.scss";

export type TreeViewMode = "list" | "chart";

const TREE_MODES = ["list", "chart"] as const satisfies readonly TreeViewMode[];

const VIEW_OPTIONS = [
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
  { value: "chart" as const, label: "Chart view", icon: <TreeChartIcon /> },
];

type Props = {
  list: ReactNode;
  chart: ReactNode;
  headingId?: string;
};

export function FamilyTreeViewSwitcher({ list, chart, headingId }: Props) {
  const [mode, setMode] = useQueryState(
    "tree",
    parseAsStringLiteral(TREE_MODES).withDefault("list"),
  );
  const isMobile = useIsMobile();

  const onModeChange = (next: TreeViewMode) => {
    setMode(next);
  };

  if (isMobile) {
    return (
      <>
        <div className={styles.heading}>
          <h2 className={styles.title} id={headingId}>
            Family Tree
          </h2>
        </div>
        {chart}
      </>
    );
  }

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
      <div className={styles.panel} hidden={mode !== "list"}>
        {list}
      </div>
      <div className={styles.panel} hidden={mode !== "chart"}>
        {chart}
      </div>
    </>
  );
}
