"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ViewToggle, ListIcon, TreeChartIcon } from "@/components/ViewToggle";
import {
  getServerSnapshot,
  readUrlSearch,
  subscribeToUrlChange,
  writeUrlParam,
} from "@/lib/listUrlState";
import { useIsMobile } from "@/lib/useIsMobile";
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
  const isMobile = useIsMobile();

  const onModeChange = (next: TreeViewMode) => {
    writeUrlParam({
      name: TREE_PARAM,
      value: next,
      defaultValue: DEFAULT_MODE,
    });
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
      <div hidden={mode !== "list"}>{list}</div>
      <div hidden={mode !== "chart"}>{chart}</div>
    </>
  );
}
