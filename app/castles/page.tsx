import type { Metadata } from "next";
import Link from "next/link";
import { loadAllCastles } from "@/lib/content";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs";
import { humanizeSlug } from "@/lib/text";
import type { Castle } from "@/lib/schemas";
import styles from "@/app/castles/page.module.scss";

export const metadata: Metadata = {
  title: "Castles · Atlas of the Known World",
  description: "The castles, towns, and strongholds of the Known World.",
};

type CastleType = Castle["type"];

const TYPE_ORDER = [
  "castle",
  "town",
  "holdfast",
  "watchtower",
  "ruin",
] as const satisfies readonly CastleType[];

const TYPE_LABELS = {
  castle: "Castles",
  town: "Towns",
  holdfast: "Holdfasts",
  watchtower: "Watchtowers",
  ruin: "Ruins",
} as const satisfies Record<CastleType, string>;

export default async function CastlesPage() {
  const castles = await loadAllCastles();
  const visible = castles.filter((c) => !c.frontmatter.draft);

  const byType = Map.groupBy(visible, (c) => c.frontmatter.type);

  const groups = TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
    type,
    label: TYPE_LABELS[type],
    items: (byType.get(type) ?? []).toSorted((a, b) =>
      a.frontmatter.name.localeCompare(b.frontmatter.name),
    ),
  }));

  return (
    <PlateLayout>
      <PageHeading
        title="Castles"
        eyebrow="Collection 04"
        icon={sectionGlyphs.castles}
        filigree="lozenge"
        subtitle="The castles, towns, and strongholds of the Known World, and the houses that hold them."
      />
      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.type} className={styles.group}>
            <h2 className={styles.typeName}>{group.label}</h2>
            <ul className={styles.list}>
              {group.items.map((c) => {
                const liege = c.frontmatter["liege-house"];
                return (
                  <li key={c.slug} className={styles.item}>
                    <Link href={`/castles/${c.slug}/`} className={styles.link}>
                      <span className={styles.name}>{c.frontmatter.name}</span>
                      {!!liege && (
                        <span className={styles.seat}>
                          House {humanizeSlug(liege)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </PlateLayout>
  );
}
