import Link from "next/link";
import type { HouseInfoEntry } from "@/lib/schemas";
import styles from "@/components/Infobox/Infobox.module.scss";

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

type EntryProps = {
  entry: HouseInfoEntry;
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

export function InfoEntry({ entry, hrefPrefix, exists }: EntryProps) {
  const canLink =
    !!entry.slug && !!hrefPrefix && (exists ? exists(entry.slug) : true);
  return (
    <li>
      {canLink ? (
        <Link href={`${hrefPrefix}/${entry.slug}/`}>{entry.name}</Link>
      ) : (
        <span>{entry.name}</span>
      )}
      {entry.note && <span className={styles.note}> ({entry.note})</span>}
    </li>
  );
}

type RowProps = {
  label: string;
  entries: HouseInfoEntry[];
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

export function InfoRow({ label, entries, hrefPrefix, exists }: RowProps) {
  if (entries.length === 0) return null;
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>
        <ul>
          {entries.map((entry, i) => (
            <InfoEntry
              key={`${entry.name}-${i}`}
              entry={entry}
              hrefPrefix={hrefPrefix}
              exists={exists}
            />
          ))}
        </ul>
      </dd>
    </div>
  );
}
