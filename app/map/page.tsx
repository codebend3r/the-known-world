import type { Metadata } from 'next';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const metadata: Metadata = {
  title: 'Map · Atlas of the Known World',
  description: 'The Map section of the atlas — coming soon.',
};

export default function MapPage() {
  return (
    <ParchmentLayout>
      <ComingSoonPage title="Map" />
    </ParchmentLayout>
  );
}
