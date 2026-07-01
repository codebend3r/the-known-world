import type { Metadata } from "next";
import Link from "next/link";
import { loadAllBattles } from "@/lib/content";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { formatBattleWhen, absoluteYear } from "@/lib/battle-date";
import styles from "@/app/battles/page.module.scss";

export const metadata: Metadata = {
  title: "Battles · Atlas of the Known World",
  description: "The wars, battles, and sieges of the Known World.",
};

type Loaded = Awaited<ReturnType<typeof loadAllBattles>>[number];

export default async function BattlesPage() {
  const battles = await loadAllBattles();
  const visible = battles.filter((b) => !b.frontmatter.draft);

  const byWar = visible.reduce((acc, b) => {
    const war = b.frontmatter.war ?? "Other";
    acc.set(war, [...(acc.get(war) ?? []), b]);
    return acc;
  }, new Map<string, Loaded[]>());

  const groups = Array.from(byWar.entries())
    .map(([war, items]) => {
      const sorted = [...items].sort(
        (a, b) =>
          absoluteYear(a.frontmatter.start) -
            absoluteYear(b.frontmatter.start) ||
          a.frontmatter.name.localeCompare(b.frontmatter.name),
      );
      return {
        war,
        items: sorted,
        earliest: absoluteYear(sorted[0].frontmatter.start),
      };
    })
    .sort((a, b) => a.earliest - b.earliest);

  const hasApproximate = visible.some(
    (b) => b.frontmatter.start.precision !== "exact",
  );

  return (
    <ParchmentLayout>
      <h1>Battles</h1>
      <p className="subtitle">
        The wars, battles, and sieges of the Known World, from the Dawn Age to
        the wars of the Five Kings.
      </p>
      <div className={styles.groups}>
        {groups.map((group) => (
          <section key={group.war} className={styles.group}>
            <h2 className={styles.warName}>{group.war}</h2>
            <ul className={styles.list}>
              {group.items.map((b) => (
                <li key={b.slug} className={styles.item}>
                  <Link href={`/battles/${b.slug}/`} className={styles.link}>
                    <span className={styles.name}>{b.frontmatter.name}</span>
                    <span className={styles.when}>
                      {formatBattleWhen(b.frontmatter.start, b.frontmatter.end)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {hasApproximate && (
        <p className={styles.legend}>* approximate or legendary date</p>
      )}
    </ParchmentLayout>
  );
}
