import Link from "next/link";
import { DesignSection } from "@/app/design/_sections/DesignSection";
import styles from "@/app/design/_sections/PageIndex.module.scss";

type PageEntry = { href: string; kind: string; title: string; blurb: string };

const PAGES = [
  {
    href: "/",
    kind: "Home",
    title: "Atlas Home",
    blurb: "Display hero over the collection index.",
  },
  {
    href: "/maps/",
    kind: "Maps",
    title: "World Map",
    blurb: "Deep-well plate, gold-ringed pins, layer chips.",
  },
  {
    href: "/timeline/",
    kind: "Timeline",
    title: "The Long Chronicle",
    blurb: "Era bands over a gold spine.",
  },
  {
    href: "/houses/",
    kind: "Index",
    title: "The Roll of Houses",
    blurb: "Live search, rank filter, register rows.",
  },
  {
    href: "/houses/stark/",
    kind: "Detail",
    title: "House Stark",
    blurb: "Banner infobox, family tree, bannermen.",
  },
  {
    href: "/characters/eddard-stark/",
    kind: "Detail",
    title: "Eddard Stark",
    blurb: "Portrait plate, particulars, relations.",
  },
  {
    href: "/battles/",
    kind: "Register",
    title: "The Fields of War",
    blurb: "War bands over dated battle rows.",
  },
  {
    href: "/castles/",
    kind: "Register",
    title: "Seats and Strongholds",
    blurb: "Type bands over held-by rows.",
  },
  {
    href: "/weapons/",
    kind: "Index",
    title: "Named Blades",
    blurb: "Search over a single-column register.",
  },
] as const satisfies readonly PageEntry[];

export function PageIndex() {
  return (
    <DesignSection heading="07 · The pages">
      <ul className={styles.pageGrid}>
        {PAGES.map((page) => (
          <li key={page.href} className={styles.pageItem}>
            <Link href={page.href} className={styles.pageCard}>
              <span className={styles.pageKind}>{page.kind}</span>
              <span className={styles.pageTitle}>{page.title}</span>
              <span className={styles.pageBlurb}>{page.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </DesignSection>
  );
}
