"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "@/components/Accordion/Accordion.module.scss";

const HEADINGS = { 2: "h2", 3: "h3", 4: "h4" } as const;

type Props = {
  id: string;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  headingLevel?: keyof typeof HEADINGS;
  children: ReactNode;
};

export function Accordion({
  id,
  title,
  count,
  open,
  onToggle,
  headingLevel = 3,
  children,
}: Props) {
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const Heading = HEADINGS[headingLevel];

  return (
    <div className={styles.accordion}>
      <Heading className={styles.heading}>
        <button
          type="button"
          id={triggerId}
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <ChevronIcon
            className={cx(styles.chevron, open && styles.chevronOpen)}
          />
          <span className={styles.title}>{title}</span>
          {count !== undefined && <span className={styles.count}>{count}</span>}
        </button>
      </Heading>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className={styles.panel}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
      focusable="false"
    >
      <path
        d="M6 4 L10 8 L6 12"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
