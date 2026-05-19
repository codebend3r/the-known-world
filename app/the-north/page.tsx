import type { Metadata } from 'next';
import { loadAllCastles } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { NorthMapView } from '@/components/NorthMapView';

export const metadata: Metadata = {
  title: 'The North · Atlas of the North',
  description: 'An interactive map of the North, from the Wall to the Neck.',
};

export default async function NorthPage() {
  const castles = await loadAllCastles();
  const visible = castles.filter((c) => !c.frontmatter.draft);

  return (
    <ParchmentLayout>
      <h1>The North</h1>
      <p className="subtitle">
        From the Wall to the Neck — castles, towns, ruins, and watchtowers.
      </p>
      <NorthMapView castles={visible} />
    </ParchmentLayout>
  );
}
