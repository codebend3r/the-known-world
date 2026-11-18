import { loadEvent, loadAllEvents, renderEntryBody } from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { EntryPlate } from "@/components/EntryPlate";
import { formatBattleWhen } from "@/lib/battle-date";
import { titleCase } from "@/lib/text";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllEvents });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadEvent,
    metadata: (event) => ({
      title: `${event.frontmatter.name} · Atlas of the Known World`,
    }),
  });
}

export default async function EventPage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const event = await loadEntryOr404({ load: loadEvent, slug });

  const fm = event.frontmatter;
  const html = await renderEntryBody({
    body: event.body,
    current: { kind: "event", slug, mentions: fm.mentions },
  });
  const subtitle = [
    titleCase(fm.type),
    formatBattleWhen({ start: fm.date, end: fm.date }),
    typeof fm.location === "string" ? fm.location : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EntryPlate
      layout="narrow"
      title={fm.name}
      subtitle={subtitle}
      html={html}
      back={{ href: "/events/", label: "All Events" }}
      sources={fm.sources}
    />
  );
}
