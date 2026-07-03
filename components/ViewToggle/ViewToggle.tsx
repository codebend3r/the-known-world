"use client";

import type { ReactNode } from "react";
import styles from "@/components/ViewToggle/ViewToggle.module.scss";

export type ViewMode = "grid" | "list";

export function isViewMode(value: unknown): value is ViewMode {
  return value === "grid" || value === "list";
}

type Option<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
};

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "View",
}: Props<T>) {
  const handleSelect = (next: T) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className={styles.toggle} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.button}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => handleSelect(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
