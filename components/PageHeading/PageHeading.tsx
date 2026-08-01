import type { ReactNode } from "react";
import { FiligreeRule } from "@/components/Filigree";
import { cx } from "@/lib/cx";
import styles from "@/components/PageHeading/PageHeading.module.scss";

type Props = {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  className?: string;
};

// The page title block shared across `PlateLayout` index pages. Rule 05: the
// plate opens with a mono eyebrow, then the display title, then a rule, then
// content. The section glyph optionally leads the `h1`; the `FiligreeRule`
// closes the block in place of a plain border.
export function PageHeading({
  title,
  subtitle,
  eyebrow,
  icon,
  className,
}: Props) {
  return (
    <hgroup className={cx(styles.heading, className)}>
      {!!eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
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
