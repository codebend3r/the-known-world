import { notFound } from 'next/navigation';
import { loadCastle, loadAllCastles, renderMarkdown } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';

export async function generateStaticParams() {
  const castles = await loadAllCastles();
  return castles
    .filter((c) => !c.frontmatter.draft)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const castle = await loadCastle(slug).catch(() => null);
  if (!castle) return { title: 'Not found' };
  return {
    title: `${castle.frontmatter.name} · Atlas of the North`,
    description: `${castle.frontmatter.name}, ${castle.frontmatter.type} in the North.`,
  };
}

export default async function CastlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const castle = await loadCastle(slug).catch(() => null);
  if (!castle) notFound();

  const html = await renderMarkdown(castle.body);

  return (
    <ParchmentLayout>
      <h1>{castle.frontmatter.name}</h1>
      <p className="subtitle">
        {castle.frontmatter.type === 'castle' ? 'Castle' : castle.frontmatter.type}
        {castle.frontmatter['liege-house'] && (
          <> &middot; Seat of House {castle.frontmatter['liege-house']}</>
        )}
      </p>
      <article dangerouslySetInnerHTML={{ __html: html }} />
      <Sources sources={castle.frontmatter.sources} />
    </ParchmentLayout>
  );
}
