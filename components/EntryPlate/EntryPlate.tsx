import type { ReactNode } from "react";
import Link from "next/link";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import { cx } from "@/lib/cx";
import type { Source } from "@/lib/schemas";
import styles from "@/components/EntryPlate/EntryPlate.module.scss";

/** A grid region the plate owns; the slot's root element takes `className`. */
type Slot = (props: { className: string }) => ReactNode;

type Layout =
  | { layout: "sidebar"; infobox: Slot }
  | { layout: "banner"; banner: Slot; infobox: Slot }
  | { layout: "narrow" };

type Props = Layout & {
  title: string;
  subtitle?: string;
  html: string;
  back: { href: string; label: string };
  sources: Source[];
  children?: ReactNode;
};

const LAYOUT_CLASS = {
  sidebar: styles.sidebar,
  banner: styles.banner,
  narrow: styles.narrow,
} as const satisfies Record<Layout["layout"], string>;

function asideSlots(layout: Layout): ReactNode {
  switch (layout.layout) {
    case "sidebar":
      return layout.infobox({ className: styles.infobox });
    case "banner":
      return (
        <>
          {layout.banner({ className: styles.bannerSlot })}
          {layout.infobox({ className: styles.infobox })}
        </>
      );
    case "narrow":
      return null;
    default: {
      const unreachable: never = layout;
      return unreachable;
    }
  }
}

export function EntryBackLink({ href, label }: Props["back"]) {
  return (
    <p className={styles.back}>
      <Link href={href}>{`← ${label}`}</Link>
    </p>
  );
}

// The detail plate shared by battles, dragons, events, and weapons: a ruled
// heading, an optional infobox column, then the body, back link, and sources.
export function EntryPlate(props: Props) {
  const { title, subtitle, html, back, sources, children } = props;
  return (
    <PlateLayout>
      <div className={cx(styles.detail, LAYOUT_CLASS[props.layout])}>
        <hgroup className={styles.heading}>
          <h1>{title}</h1>
          {subtitle !== undefined && <p className="subtitle">{subtitle}</p>}
        </hgroup>
        {asideSlots(props)}
        <div
          className={cx(
            styles.main,
            props.layout === "narrow" && styles.measure,
          )}
        >
          {children}
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <EntryBackLink {...back} />
          <Sources sources={sources} />
        </div>
      </div>
    </PlateLayout>
  );
}
