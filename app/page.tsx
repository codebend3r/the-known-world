import Link from 'next/link';
import { ParchmentLayout } from '@/components/ParchmentLayout';

export default function Home() {
  return (
    <ParchmentLayout>
      <h1>Atlas of the Known World</h1>
      <p className="subtitle">A chronicle of castles, houses, and history.</p>

      <p className="drop-cap">
        Choose a region to begin. The atlas grows over time — only the North is mapped at present.
      </p>

      <h2>Regions</h2>
      <ul>
        <li>
          <Link href="/the-north/"><strong>The North</strong></Link> — from the Wall to the Neck.
        </li>
        <li style={{ color: 'var(--ink-faded)' }}>
          <em>Other regions of Westeros — not yet mapped.</em>
        </li>
        <li style={{ color: 'var(--ink-faded)' }}>
          <em>Essos — not yet mapped.</em>
        </li>
      </ul>
    </ParchmentLayout>
  );
}
