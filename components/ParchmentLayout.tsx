import type { ReactNode } from "react";
import styles from "@/components/ParchmentLayout.module.scss";

type Props = {
  children: ReactNode;
};

export function ParchmentLayout({ children }: Props) {
  return <main className={styles.page}>{children}</main>;
}
