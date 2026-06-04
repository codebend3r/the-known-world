"use client";

import styles from "@/components/SortToggle.module.scss";

export type SortDirection = "asc" | "desc";

type Props = {
  value: SortDirection;
  onChange: (value: SortDirection) => void;
};

export function SortToggle({ value, onChange }: Props) {
  const handleSelect = (next: SortDirection) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className={styles.toggle} role="group" aria-label="Sort direction">
      <button
        type="button"
        className={styles.button}
        aria-label="Sort A to Z"
        aria-pressed={value === "asc"}
        onClick={() => handleSelect("asc")}
      >
        <AscIcon />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Sort Z to A"
        aria-pressed={value === "desc"}
        onClick={() => handleSelect("desc")}
      >
        <DescIcon />
      </button>
    </div>
  );
}

function AscIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <text
        x="1"
        y="7"
        fontSize="6"
        fontFamily="serif"
        fontWeight="700"
        fill="currentColor"
      >
        A
      </text>
      <text
        x="1"
        y="14"
        fontSize="6"
        fontFamily="serif"
        fontWeight="700"
        fill="currentColor"
      >
        Z
      </text>
      <path
        d="M11 3 L11 13 M8 10 L11 13 L14 10"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DescIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <text
        x="1"
        y="7"
        fontSize="6"
        fontFamily="serif"
        fontWeight="700"
        fill="currentColor"
      >
        Z
      </text>
      <text
        x="1"
        y="14"
        fontSize="6"
        fontFamily="serif"
        fontWeight="700"
        fill="currentColor"
      >
        A
      </text>
      <path
        d="M11 13 L11 3 M8 6 L11 3 L14 6"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
