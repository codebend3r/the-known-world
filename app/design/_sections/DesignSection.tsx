import type { ReactNode } from "react";
import styles from "@/app/design/_sections/DesignSection.module.scss";

export function DesignSection({
  heading,
  lede,
  children,
}: {
  heading: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>{heading}</h2>
      {lede ? <p className={styles.sectionLede}>{lede}</p> : null}
      {children}
    </section>
  );
}
