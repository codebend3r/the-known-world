import Link from "next/link";
import styles from "@/components/ComingSoonPage/ComingSoonPage.module.scss";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <p className={styles.caption}>
        <Link href="/">Atlas of the Known World</Link>
      </p>
      <h1>{title}</h1>
      <p className="subtitle">This section is coming soon.</p>
      <p>
        <Link href="/">
          <span aria-hidden="true">← </span>Return to the menu
        </Link>
      </p>
    </>
  );
}
