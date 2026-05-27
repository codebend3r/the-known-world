import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadAllCharacters, loadCharacter } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';

export async function generateStaticParams() {
  const characters = await loadAllCharacters();
  return characters
    .filter((c) => !c.frontmatter.draft)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) return { title: 'Not found' };
  return {
    title: `${character.frontmatter.name} · Atlas of the Known World`,
  };
}

export default async function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await loadCharacter(slug).catch(() => null);
  if (!character) notFound();

  return (
    <ParchmentLayout>
      <h1>{character.frontmatter.name}</h1>
      <p className="subtitle">No data yet.</p>

      <p className="character-detail__back">
        <Link href="/characters/">← All Characters</Link>
      </p>
    </ParchmentLayout>
  );
}
