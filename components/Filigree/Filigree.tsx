import { cx } from "@/lib/cx";
import styles from "@/components/Filigree/Filigree.module.scss";

type FlourishProps = {
  mirrored?: boolean;
  className?: string;
};

// A short run of pipework: an engraved rail feeding a cogwheel, closed off
// with a hex nut. Reads left to right; `mirrored` flips it for the
// right-hand side.
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
        <path
          className={styles.nut}
          d="M90 10.4 L93.1 12.2 V15.8 L90 17.6 L86.9 15.8 V12.2 Z"
        />
      </svg>
    </span>
  );
}

type RuleProps = {
  className?: string;
};

// The atlas signature: a pressure gauge set into an engraved rail, its
// needle wandering the dial. It underlines every page title and divides
// long pages.
export function FiligreeRule({ className }: RuleProps) {
  return (
    <span className={cx(styles.rule, className)} aria-hidden="true">
      <svg viewBox="0 0 240 22" fill="none" preserveAspectRatio="xMidYMid meet">
        <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <line x1="14" y1="12" x2="100" y2="12" />
          <line x1="140" y1="12" x2="226" y2="12" />
          <path d="M106 12 H110.5" />
          <path d="M129.5 12 H134" />
          <circle cx="120" cy="12" r="8.5" fill="none" />
          <path d="M111.5 12 L113.5 12" />
          <path d="M114 6 L115.4 7.4" />
          <path d="M120 3.5 L120 5.5" />
          <path d="M126 6 L124.6 7.4" />
          <path d="M128.5 12 L126.5 12" />
        </g>
        <g className={styles.needle}>
          <line
            x1="120"
            y1="12"
            x2="115.6"
            y2="7.2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
        <circle cx="120" cy="12" r="1.8" fill="currentColor" />
        <circle cx="104" cy="12" r="1.6" fill="currentColor" />
        <circle cx="136" cy="12" r="1.6" fill="currentColor" />
        <circle cx="14" cy="12" r="1.3" fill="currentColor" />
        <circle cx="226" cy="12" r="1.3" fill="currentColor" />
      </svg>
    </span>
  );
}
