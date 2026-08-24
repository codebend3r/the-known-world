"use client";

import { cx } from "@/lib/cx";
import { useSpoilers } from "@/lib/spoilers";
import styles from "@/components/SpoilerToggle/SpoilerToggle.module.scss";

type Props = {
  className?: string;
};

export function SpoilerToggle({ className }: Props) {
  const { isShowingSpoilers, toggleSpoilers } = useSpoilers();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isShowingSpoilers}
      className={cx(styles.toggle, className)}
      onClick={toggleSpoilers}
    >
      <span className={styles.label}>Spoilers</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
