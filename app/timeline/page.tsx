import type { Metadata } from "next";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { TimelineChart } from "@/components/TimelineChart";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { loadAllBattles } from "@/lib/content";
import { buildTimeline } from "@/lib/timeline";
import styles from "@/app/timeline/page.module.scss";

export const metadata: Metadata = {
  title: "Timeline · Atlas of the Known World",
  description:
    "The battles of the Known World in time and place, from the Dawn Age to the War of the Five Kings.",
};

export default async function TimelinePage() {
  const battles = await loadAllBattles();
  const published = battles.filter((b) => !b.frontmatter.draft);
  const model = buildTimeline({
    battles: published.map((b) => b.frontmatter),
  });
  const hasApproximate = published.some(
    (b) => b.frontmatter.start.precision !== "exact",
  );

  return (
    <ParchmentLayout>
      <PageHeading
        title="Timeline"
        icon={sectionGlyphs.timeline}
        subtitle="Trace the centuries: every battle of the Known World, laid out in time and place."
      />
      <TimelineChart model={model} />
      {hasApproximate && (
        <p className={styles.legend}>* approximate or legendary date</p>
      )}
    </ParchmentLayout>
  );
}
