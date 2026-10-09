import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "@/components/Filigree/Filigree.module.scss";

type FlourishProps = {
  isMirrored?: boolean;
  className?: string;
};

export function FiligreeFlourish({
  isMirrored = false,
  className,
}: FlourishProps) {
  return (
    <span
      className={cx(styles.flourish, isMirrored && styles.mirrored, className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 96 28"
        fill="none"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 14 C 22 14, 38 14, 52 13.2" />
          <path d="M40 13.6 C 41.5 7.5, 50 7, 53 11 C 54.5 13, 49.5 14.5, 44 13.4" />
          <path d="M52 13.2 C 62 12.8, 70 13.2, 75 16.4 C 80.5 20, 89 18.4, 90 12.4 C 90.9 6.7, 83 4.6, 79.5 9.2 C 77 12.4, 80.5 14.6, 83.5 12.6" />
        </g>
        <circle cx="2" cy="14" r="1.3" fill="currentColor" />
      </svg>
    </span>
  );
}

export const FILIGREE_VARIANTS = [
  "diamond",
  "lozenge",
  "seven",
  "scroll",
  "chain",
  "scale",
  "throne",
] as const;

export type FiligreeVariant = (typeof FILIGREE_VARIANTS)[number];

type Mark = {
  viewBox: string;
  isCapped: boolean;
  body: ReactNode;
};

const SCROLL_HALF = (
  <>
    <path d="M4 0 C 8 0, 10 -6, 15 -6 C 20 -6, 21.5 -1.5, 18.5 0 C 16 1.2, 13.8 -1.2, 15.6 -2.8" />
    <path d="M7.5 0.8 C 14 6.5, 24 7, 32 2.8 C 37 0.3, 42 0, 52 0" />
    <path
      d="M23.5 5.2 C 25.5 8.6, 29 9.4, 31 8.2 C 29.4 6.4, 26.6 5.2, 23.5 5.2 Z"
      fill="currentColor"
      stroke="none"
    />
  </>
);

const BLADES = [
  { d: "M-2.43 -1.76 L-5.09 -5.24 L-12.14 -8.82 L-6.56 -3.22 Z", opacity: 0.5 },
  {
    d: "M-1.76 -2.43 L-3.71 -7.24 L-10.58 -14.56 L-5.74 -5.77 Z",
    opacity: 0.7,
  },
  {
    d: "M-0.93 -2.85 L-1.56 -8.83 L-6.49 -19.97 L-3.93 -8.06 Z",
    opacity: 0.88,
  },
  { d: "M0 -3 L1.25 -9.72 L0 -24 L-1.25 -9.72 Z", opacity: 1 },
  { d: "M0.93 -2.85 L3.93 -8.06 L6.49 -19.97 L1.56 -8.83 Z", opacity: 0.88 },
  { d: "M1.76 -2.43 L5.74 -5.77 L10.58 -14.56 L3.71 -7.24 Z", opacity: 0.7 },
  { d: "M2.43 -1.76 L6.56 -3.22 L12.14 -8.82 L5.09 -5.24 Z", opacity: 0.5 },
] as const;

const CHAIN_FACE_LINKS = [-32, -16, 0, 16, 32] as const;
const CHAIN_EDGE_LINKS = [-24, -8, 8, 24] as const;

const MARKS = {
  diamond: {
    viewBox: "0 0 32 18",
    isCapped: false,
    body: (
      <>
        <path
          d="M16 2.5 L23 9 L16 15.5 L9 9 Z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="9" r="1.5" fill="currentColor" />
        <circle cx="4" cy="9" r="1.2" fill="currentColor" />
        <circle cx="28" cy="9" r="1.2" fill="currentColor" />
      </>
    ),
  },
  lozenge: {
    viewBox: "-34 -13 68 26",
    isCapped: true,
    body: (
      <>
        <path
          d="M0 -11 L11 0 L0 11 L-11 0 Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill="currentColor" />
        <path
          d="M18 -3.5 L21.5 0 L18 3.5 L14.5 0 Z M-18 -3.5 L-14.5 0 L-18 3.5 L-21.5 0 Z"
          fill="currentColor"
        />
        <circle cx="27" r="1.2" fill="currentColor" />
        <circle cx="-27" r="1.2" fill="currentColor" />
      </>
    ),
  },
  seven: {
    viewBox: "-36 -14 72 28",
    isCapped: false,
    body: (
      <>
        <path
          d="M0 -11.9 L5.42 11.86 L-9.77 -7.19 L12.19 3.38 L-12.19 3.38 L9.77 -7.19 L-5.42 11.86 Z"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <circle cy="0.6" r="1.7" fill="currentColor" />
        <circle cx="20" r="1.4" fill="currentColor" />
        <circle cx="-20" r="1.4" fill="currentColor" />
        <circle cx="25.5" r="1" fill="currentColor" />
        <circle cx="-25.5" r="1" fill="currentColor" />
        <circle cx="30.5" r="0.7" fill="currentColor" />
        <circle cx="-30.5" r="0.7" fill="currentColor" />
      </>
    ),
  },
  scroll: {
    viewBox: "-52 -14 104 28",
    isCapped: false,
    body: (
      <>
        <g
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g>{SCROLL_HALF}</g>
          <g transform="scale(-1 1)">{SCROLL_HALF}</g>
        </g>
        <path d="M0 -3.6 L3 0 L0 3.6 L-3 0 Z" fill="currentColor" />
        <circle cy="-7.5" r="1" fill="currentColor" />
        <circle cy="7.5" r="1" fill="currentColor" />
      </>
    ),
  },
  chain: {
    viewBox: "-39 -7 78 14",
    isCapped: false,
    body: (
      <>
        {CHAIN_FACE_LINKS.map((x) => (
          <ellipse
            key={x}
            cx={x}
            rx="6.2"
            ry="3.9"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        ))}
        {CHAIN_EDGE_LINKS.map((x) => (
          <rect
            key={x}
            x={x - 6}
            y="-1.1"
            width="12"
            height="2.2"
            rx="1.1"
            fill="currentColor"
          />
        ))}
      </>
    ),
  },
  scale: {
    viewBox: "-22 -16 44 32",
    isCapped: false,
    body: (
      <>
        <path d="M-22 0 H-15 M15 0 H22" stroke="currentColor" strokeWidth="1" />
        <circle r="10.5" stroke="currentColor" strokeWidth="0.9" />
        <path
          transform="rotate(45)"
          d="M0 -8.5 L1.6 -1.6 L8.5 0 L1.6 1.6 L0 8.5 L-1.6 1.6 L-8.5 0 L-1.6 -1.6 Z"
          fill="currentColor"
          opacity="0.6"
        />
        <path
          d="M0 -15 L2.4 -2.4 L15 0 L2.4 2.4 L0 15 L-2.4 2.4 L-15 0 L-2.4 -2.4 Z"
          fill="currentColor"
        />
        <path
          className={styles.cut}
          d="M0 -15 L2.4 -2.4 L0 0 Z M15 0 L2.4 2.4 L0 0 Z M0 15 L-2.4 2.4 L0 0 Z M-15 0 L-2.4 -2.4 L0 0 Z"
          opacity="0.45"
        />
        <circle className={styles.cut} r="1.3" />
      </>
    ),
  },
  throne: {
    viewBox: "-20 -25 40 33",
    isCapped: false,
    body: (
      <>
        <path d="M-20 0 H-5 M5 0 H20" stroke="currentColor" strokeWidth="1.5" />
        {BLADES.map(({ d, opacity }) => (
          <path key={d} d={d} fill="currentColor" opacity={opacity} />
        ))}
        <path d="M-5 0 A5 5 0 0 1 5 0 Z" fill="currentColor" />
        <path d="M0 2.4 L2.4 4.8 L0 7.2 L-2.4 4.8 Z" fill="currentColor" />
      </>
    ),
  },
} as const satisfies Record<FiligreeVariant, Mark>;

const FADES = {
  end: styles.fadeEnd,
  both: styles.fadeBoth,
} as const;

type RuleProps = {
  variant?: FiligreeVariant;
  fade?: keyof typeof FADES;
  className?: string;
};

function Cap({ className }: { className?: string }) {
  return (
    <svg
      className={cx(styles.cap, className)}
      viewBox="-6 -6 12 12"
      fill="none"
      focusable="false"
    >
      <path
        d="M0 -4.5 L4.5 0 L0 4.5 L-4.5 0 Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle r="1.4" fill="currentColor" />
    </svg>
  );
}

// The hairlines are CSS so they stretch to any container width; only the mark
// is SVG, so it keeps its size however wide the rule runs. A capped variant
// closes on its end caps, so it never fades.
export function FiligreeRule({
  variant = "diamond",
  fade = "end",
  className,
}: RuleProps) {
  const { viewBox, isCapped, body } = MARKS[variant];
  return (
    <span
      className={cx(
        styles.rule,
        styles[variant],
        !isCapped && FADES[fade],
        className,
      )}
      aria-hidden="true"
    >
      {isCapped && <Cap className={styles.capStart} />}
      <span className={cx(styles.line, styles.lead)} />
      <svg
        className={styles.mark}
        viewBox={viewBox}
        fill="none"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        {body}
      </svg>
      <span className={cx(styles.line, styles.tail)} />
      {isCapped && <Cap className={styles.capEnd} />}
    </span>
  );
}
