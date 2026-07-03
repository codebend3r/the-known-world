"use client";

import Link from "next/link";
import { useState } from "react";
import { cx } from "@/lib/cx";
import type { TimelineEvent } from "@/lib/timeline";
import styles from "@/components/TimelineCluster/TimelineCluster.module.scss";

type TimelineClusterProps = {
  label: string;
  when: string;
  events: TimelineEvent[];
};

export function TimelineCluster({ label, when, events }: TimelineClusterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cx(styles.cluster, isOpen && styles.clusterOpen)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (!(next instanceof Node) || !e.currentTarget.contains(next)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.pill}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.count}>{label}</span>
        <span className={styles.when}>{when}</span>
      </button>
      {isOpen && (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={event.slug} className={styles.item}>
              <Link href={event.href} className={styles.link}>
                <span className={styles.name}>{event.name}</span>
                <span className={styles.linkWhen}>{event.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
