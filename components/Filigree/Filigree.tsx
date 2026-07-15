import { cx } from "@/lib/cx";
import styles from "@/components/Filigree/Filigree.module.scss";

type FlourishProps = {
  mirrored?: boolean;
  className?: string;
};

// A short conduit: an engraved rail feeding a cogwheel, ending in a charged
// spark. Reads left to right; `mirrored` flips it for the right-hand side.
export function FiligreeFlourish({
  mirrored = false,
  className,
}: FlourishProps) {
  return (
    <span
      className={cx(styles.flourish, mirrored && styles.mirrored, className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 96 28" fill="none" preserveAspectRatio="xMidYMid meet">
        <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M2 14 H63" />
          <circle cx="74" cy="14" r="7" fill="none" />
          <path d="M81 14 H83.5" />
          <path d="M78.95 18.95 L80.7 20.7" />
          <path d="M74 21 V23.5" />
          <path d="M69.05 18.95 L67.3 20.7" />
          <path d="M67 14 H64.5" />
          <path d="M69.05 9.05 L67.3 7.3" />
          <path d="M74 7 V4.5" />
          <path d="M78.95 9.05 L80.7 7.3" />
        </g>
        <circle cx="74" cy="14" r="2.2" fill="currentColor" />
        <circle cx="2" cy="14" r="1.3" fill="currentColor" />
        <path className={styles.gem} d="M90 10.5 L93 14 L90 17.5 L87 14 Z" />
      </svg>
    </span>
  );
}

type RuleProps = {
  className?: string;
};

// The atlas signature: a hextech crystal set into an engraved rail, ringed
// by cog collars. It underlines every page title and divides long pages.
export function FiligreeRule({ className }: RuleProps) {
  return (
    <span className={cx(styles.rule, className)} aria-hidden="true">
      <svg viewBox="0 0 240 18" fill="none" preserveAspectRatio="xMidYMid meet">
        <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <line x1="16" y1="9" x2="98" y2="9" />
          <line x1="142" y1="9" x2="224" y2="9" />
          <circle cx="104" cy="9" r="2.6" fill="none" />
          <circle cx="136" cy="9" r="2.6" fill="none" />
          <path d="M104 5.2 V3.4" />
          <path d="M104 12.8 V14.6" />
          <path d="M136 5.2 V3.4" />
          <path d="M136 12.8 V14.6" />
        </g>
        <path
          className={styles.gem}
          d="M114.5 9 L117.5 3.6 L122.5 3.6 L125.5 9 L122.5 14.4 L117.5 14.4 Z"
        />
        <path
          className={styles.gemFacet}
          d="M117.5 3.6 L122.5 14.4 M122.5 3.6 L117.5 14.4"
        />
        <circle cx="16" cy="9" r="1.3" fill="currentColor" />
        <circle cx="224" cy="9" r="1.3" fill="currentColor" />
      </svg>
    </span>
  );
}
