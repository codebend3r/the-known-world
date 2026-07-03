import type { Metadata } from "next";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { TimelineChart } from "@/components/TimelineChart";
import { TimelineMinimap } from "@/components/TimelineMinimap";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { loadAllBattles, loadAllEvents } from "@/lib/content";
import { buildTimeline } from "@/lib/timeline";
import styles from "@/app/timeline/page.module.scss";

export const metadata: Metadata = {
  title: "Timeline · Atlas of the Known World",
  description:
    "The battles and great events of the Known World in time and place, from the Dawn Age to the War of the Five Kings.",
};

export default async function TimelinePage() {
  const [battles, events] = await Promise.all([
    loadAllBattles(),
    loadAllEvents(),
  ]);
  const published = battles.filter((b) => !b.frontmatter.draft);
  const publishedEvents = events.filter((e) => !e.frontmatter.draft);
  const model = buildTimeline({
    battles: published.map((b) => b.frontmatter),
    events: publishedEvents.map((e) => e.frontmatter),
  });
  const hasApproximate =
    published.some((b) => b.frontmatter.start.precision !== "exact") ||
    publishedEvents.some((e) => e.frontmatter.date.precision !== "exact");

  return (
    <ParchmentLayout>
      <PageHeading
        title="Timeline"
        icon={sectionGlyphs.timeline}
        subtitle="Trace the centuries: the battles and great events of the Known World, laid out in time and place."
      />
      <div className={styles.chartBleed}>
        <TimelineChart model={model} bodyId="timeline-chart" />
      </div>
      <TimelineMinimap ticks={model.ticks} targetId="timeline-chart" />
      {hasApproximate && (
        <p className={styles.legend}>* approximate or legendary date</p>
      )}
    </ParchmentLayout>
  );
}
