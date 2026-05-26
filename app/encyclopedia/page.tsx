import type { Metadata } from 'next';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const metadata: Metadata = {
  title: 'Encyclopedia · Atlas of the Known World',
  description: 'The Encyclopedia section of the atlas — coming soon.',
};

export default function EncyclopediaPage() {
  return (
    <ParchmentLayout>
      <ComingSoonPage title="Encyclopedia" />
    </ParchmentLayout>
  );
}
