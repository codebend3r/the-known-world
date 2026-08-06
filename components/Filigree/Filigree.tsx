import { cx } from "@/lib/cx";
import styles from "@/components/Filigree/Filigree.module.scss";

type FlourishProps = {
  mirrored?: boolean;
  className?: string;
};

export function FiligreeFlourish({
  mirrored = false,
  className,
}: FlourishProps) {
  return (
    <span
      className={cx(styles.flourish, mirrored && styles.mirrored, className)}
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

type RuleProps = {
  className?: string;
};

export function FiligreeRule({ className }: RuleProps) {
  return (
    <span className={cx(styles.rule, className)} aria-hidden="true">
      <svg
        viewBox="0 0 240 18"
        fill="none"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <line x1="22" y1="9" x2="104" y2="9" />
          <line x1="136" y1="9" x2="218" y2="9" />
          <path d="M120 2.5 L127 9 L120 15.5 L113 9 Z" strokeLinejoin="round" />
        </g>
        <circle cx="120" cy="9" r="1.5" fill="currentColor" />
        <circle cx="108" cy="9" r="1.2" fill="currentColor" />
        <circle cx="132" cy="9" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}
