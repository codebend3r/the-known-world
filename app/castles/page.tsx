import type { Metadata } from "next";
import Link from "next/link";
import { loadAllCastles } from "@/lib/content";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import styles from "@/app/castles/page.module.scss";

export const metadata: Metadata = {
  title: "Castles · Atlas of the Known World",
  description: "The castles, towns, and strongholds of the Known World.",
};

type Loaded = Awaited<ReturnType<typeof loadAllCastles>>[number];
type CastleType = Loaded["frontmatter"]["type"];

const TYPE_ORDER: CastleType[] = [
  "castle",
  "town",
  "holdfast",
  "watchtower",
  "ruin",
];

const TYPE_LABELS: Record<CastleType, string> = {
  castle: "Castles",
  town: "Towns",
  holdfast: "Holdfasts",
  watchtower: "Watchtowers",
  ruin: "Ruins",
};

function formatHouse(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CastlesPage() {
  const castles = await loadAllCastles();
  const visible = castles.filter((c) => !c.frontmatter.draft);

  const byType = visible.reduce((acc, c) => {
    const type = c.frontmatter.type;
    acc.set(type, [...(acc.get(type) ?? []), c]);
    return acc;
  }, new Map<CastleType, Loaded[]>());

  const groups = TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
    type,
    label: TYPE_LABELS[type],
    items: [...(byType.get(type) ?? [])].sort((a, b) =>
      a.frontmatter.name.localeCompare(b.frontmatter.name),
    ),
  }));

  return (
    <PlateLayout>
      <PageHeading
        title="Castles"
        eyebrow="Collection 04"
        icon={sectionGlyphs.castles}
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
                          House {formatHouse(liege)}
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
