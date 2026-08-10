import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAllEvents } from "@/lib/content";
import {
  absoluteYear,
  formatBattleWhen,
  isApproximate,
} from "@/lib/battle-date";
import { titleCase } from "@/lib/text";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";
import {
  FilteredEventList,
  type EventItem,
} from "@/components/FilteredEventList";

export const metadata: Metadata = {
  title: "Events · Atlas of the Known World",
  description:
    "The weddings, treaties, betrayals, and omens that turned the Known World.",
};

export default async function EventsPage() {
  const events = await loadAllEvents();

  // Chronological, oldest first, matching how the timeline reads them. A search
  // re-ranks by relevance, so this only sets the resting order.
  const items: EventItem[] = events
    .filter((e) => !e.frontmatter.draft)
    .sort(
      (a, b) =>
        absoluteYear(a.frontmatter.date) - absoluteYear(b.frontmatter.date) ||
        a.frontmatter.name.localeCompare(b.frontmatter.name),
    )
    .map(({ frontmatter }) => ({
      slug: frontmatter.slug,
      name: frontmatter.name,
      typeLabel: titleCase(frontmatter.type),
      when: formatBattleWhen(frontmatter.date, frontmatter.date),
      location:
        typeof frontmatter.location === "string" ? frontmatter.location : null,
      approximate: isApproximate(frontmatter.date),
    }));

  return (
    <PlateLayout>
      <PageHeading
        title="Events"
        eyebrow="Collection 09"
        icon={sectionGlyphs.events}
        subtitle="The weddings, treaties, betrayals, and omens that turned the Known World."
      />
      <Suspense fallback={<ListSearchSkeleton placeholder="Search events…" />}>
        <FilteredEventList items={items} />
      </Suspense>
    </PlateLayout>
  );
}
