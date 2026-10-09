import { notFound } from "next/navigation";
import { loadCastle, loadAllCastles, renderMarkdown } from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import styles from "@/app/castles/[slug]/page.module.scss";

export async function generateStaticParams() {
  const castles = await loadAllCastles();
  return castles
    .filter((c) => !c.frontmatter.draft)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const castle = await loadCastle(slug).catch(() => null);
  if (!castle) return { title: "Not found" };
  return {
    title: `${castle.frontmatter.name} · Atlas of the North`,
    description: `${castle.frontmatter.name}, ${castle.frontmatter.type} in the North.`,
  };
}

export default async function CastlePage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const castle = await loadCastle(slug).catch(() => null);
  if (!castle) notFound();

  const html = await renderMarkdown({ source: castle.body });

  return (
    <PlateLayout>
      <h1>{castle.frontmatter.name}</h1>
      <p className="subtitle">
        {castle.frontmatter.type === "castle"
          ? "Castle"
          : castle.frontmatter.type}
        {castle.frontmatter["liege-house"] && (
          <> &middot; Seat of House {castle.frontmatter["liege-house"]}</>
        )}
      </p>
      <article
        className={styles.body}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Sources sources={castle.frontmatter.sources} />
    </PlateLayout>
  );
}
