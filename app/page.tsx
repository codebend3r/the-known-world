import { ParchmentLayout } from '@/components/ParchmentLayout';
import { MainMenu } from '@/components/MainMenu';

export default function Home() {
  return (
    <ParchmentLayout>
      <h1>Atlas of the Known World</h1>
      <p className="subtitle">Choose a path.</p>
      <MainMenu />
    </ParchmentLayout>
  );
}
