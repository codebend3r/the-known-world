"use client";

import type { TimelineTick } from "@/lib/timeline";
import styles from "@/components/TimelineMinimap/TimelineMinimap.module.scss";

type TimelineMinimapProps = {
  ticks: TimelineTick[];
  targetId: string;
};

const SCROLL_OFFSET_PX = 120;

export function TimelineMinimap({ ticks, targetId }: TimelineMinimapProps) {
  const jumpTo = (tick: TimelineTick) => {
    const body = document.getElementById(targetId);
    if (!body) return;
    const top =
      body.getBoundingClientRect().top +
      window.scrollY +
      tick.y -
      SCROLL_OFFSET_PX;
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <nav className={styles.minimap} aria-label="Jump to year">
      <ul className={styles.list}>
        {ticks.map((tick) => (
          <li key={tick.label} className={styles.item}>
            <button
              type="button"
              className={styles.year}
              onClick={() => jumpTo(tick)}
            >
              {tick.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
