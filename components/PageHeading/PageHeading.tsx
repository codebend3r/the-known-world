import type { ReactNode } from "react";
import { FiligreeRule } from "@/components/Filigree";
import { cx } from "@/lib/cx";
import styles from "@/components/PageHeading/PageHeading.module.scss";

type Props = {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

// The page title block shared across `ParchmentLayout` index pages: an `h1`
// (optionally led by the section glyph), an optional italic subtitle, and the
// ornamental `FiligreeRule` that underlines the title in place of a plain
// border.
export function PageHeading({ title, subtitle, icon, className }: Props) {
  return (
    <hgroup className={cx(styles.heading, className)}>
      <h1>
        {!!icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        {title}
      </h1>
      {!!subtitle && <p className="subtitle">{subtitle}</p>}
      <FiligreeRule className={styles.rule} />
    </hgroup>
  );
}
