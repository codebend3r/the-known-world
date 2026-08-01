import type { ReactNode } from "react";
import styles from "@/components/PlateLayout/PlateLayout.module.scss";

type Props = {
  children: ReactNode;
};

// The page plate: the 1240px measure and 56px gutter every route sits inside.
export function PlateLayout({ children }: Props) {
  return <main className={styles.page}>{children}</main>;
}
