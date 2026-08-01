import type { Metadata } from "next";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { TimelineExplorer } from "@/components/TimelineExplorer";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { loadAllBattles, loadAllEvents } from "@/lib/content";
import { prepareTimeline } from "@/lib/timeline";
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
  const source = prepareTimeline({
    battles: published.map((b) => b.frontmatter),
    events: publishedEvents.map((e) => e.frontmatter),
  });
  const hasApproximate =
    published.some((b) => b.frontmatter.start.precision !== "exact") ||
    publishedEvents.some((e) => e.frontmatter.date.precision !== "exact");

  return (
    <PlateLayout>
      <PageHeading
        title="Timeline"
        eyebrow="Collection 02"
        icon={sectionGlyphs.timeline}
        subtitle="Trace the centuries: the battles and great events of the Known World, laid out in time and place."
      />
      <div className={styles.chartBleed}>
        <TimelineExplorer source={source} />
      </div>
      {hasApproximate && (
        <p className={styles.legend}>* approximate or legendary date</p>
      )}
    </PlateLayout>
  );
}
