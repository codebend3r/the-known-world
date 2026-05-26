import Link from 'next/link';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <p className="coming-soon-caption">
        <Link href="/">Atlas of the Known World</Link>
      </p>
      <h1>{title}</h1>
      <p className="subtitle">
        This section of the atlas has not yet been transcribed.
      </p>
      <p>
        <Link href="/">← Return to the menu</Link>
      </p>
    </>
  );
}
