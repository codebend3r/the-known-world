import Link from 'next/link';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { loadAllCastles } from '@/lib/content';

export default async function Home() {
  const castles = await loadAllCastles();
  const visible = castles.filter((c) => !c.frontmatter.draft);

  return (
    <ParchmentLayout>
      <h1>Atlas of the North</h1>
      <p className="subtitle">An interactive chronicle of the lands beyond the Neck.</p>

      <p className="drop-cap">
        From the Wall to the Neck, the North is the largest of the Seven Kingdoms,
        a realm of pine and stone, of cold winds and old gods. This atlas charts its
        castles, its houses, its battles, and the long history of those who shaped it.
      </p>

      <h2>Castles</h2>
      <ul>
        {visible.map((c) => (
          <li key={c.frontmatter.slug}>
            <Link href={`/castles/${c.frontmatter.slug}/`}>{c.frontmatter.name}</Link>
          </li>
        ))}
      </ul>
    </ParchmentLayout>
  );
}
