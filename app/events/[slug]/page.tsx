import { notFound } from "next/navigation";
import Link from "next/link";
import { loadEvent, loadAllEvents, renderMarkdown } from "@/lib/content";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import { formatBattleWhen } from "@/lib/battle-date";
import styles from "@/app/events/[slug]/page.module.scss";

export async function generateStaticParams() {
  const events = await loadAllEvents();
  return events
    .filter((e) => !e.frontmatter.draft)
    .map((e) => ({ slug: e.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await loadEvent(slug).catch(() => null);
  if (!event) return { title: "Not found" };
  return {
    title: `${event.frontmatter.name} · Atlas of the Known World`,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await loadEvent(slug).catch(() => null);
  if (!event) notFound();

  const fm = event.frontmatter;
  const html = event.body.trim() ? await renderMarkdown(event.body) : "";
  const typeLabel = fm.type[0].toUpperCase() + fm.type.slice(1);
  const subtitle = [
    typeLabel,
    formatBattleWhen(fm.date, fm.date),
    typeof fm.location === "string" ? fm.location : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PlateLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <div className={styles.main}>
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/events/">← All Events</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </PlateLayout>
  );
}
