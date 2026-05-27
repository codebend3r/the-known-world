import type { Metadata } from 'next';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const metadata: Metadata = {
  title: 'Maps · Atlas of the Known World',
  description: 'The Maps section of the atlas — coming soon.',
};

export default function MapsPage() {
  return (
    <ParchmentLayout>
      <ComingSoonPage title="Maps" />
    </ParchmentLayout>
  );
}
