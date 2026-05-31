import type { ReactNode } from "react";
import styles from "@/components/DropCap.module.scss";

export function DropCap({ children }: { children: ReactNode }) {
  return <p className={styles.dropCap}>{children}</p>;
}
