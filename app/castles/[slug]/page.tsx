import { loadCastle, loadAllCastles, renderMarkdown } from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { PlateLayout } from "@/components/PlateLayout";
import { Sources } from "@/components/Sources";
import styles from "@/app/castles/[slug]/page.module.scss";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllCastles });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadCastle,
    metadata: (castle) => ({
      title: `${castle.frontmatter.name} · Atlas of the North`,
      description: `${castle.frontmatter.name}, ${castle.frontmatter.type} in the North.`,
    }),
  });
}

export default async function CastlePage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const castle = await loadEntryOr404({ load: loadCastle, slug });

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
