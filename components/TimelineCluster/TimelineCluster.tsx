"use client";

import Link from "next/link";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import type { TimelineEvent } from "@/lib/timeline";
import { TimelineClusterContext } from "@/components/TimelineCluster/TimelineClusterProvider";
import styles from "@/components/TimelineCluster/TimelineCluster.module.scss";

type TimelineClusterProps = {
  label: string;
  when: string;
  events: TimelineEvent[];
};

export function TimelineCluster({ label, when, events }: TimelineClusterProps) {
  const context = useContext(TimelineClusterContext);
  const [localOpenId, setLocalOpenId] = useState<string | null>(null);
  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const openId = !!context ? context.openId : localOpenId;
  const setOpenId = !!context ? context.setOpenId : setLocalOpenId;
  const isOpen = openId === id;
  const close = () => {
    if (isOpen) setOpenId(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!(rootRef.current?.contains(target) ?? false)) setOpenId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, setOpenId]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.cluster, isOpen && styles.clusterOpen)}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (!(next instanceof Node) || !e.currentTarget.contains(next)) {
          close();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <button
        type="button"
        className={styles.pill}
        aria-expanded={isOpen}
        onClick={() => setOpenId(isOpen ? null : id)}
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
