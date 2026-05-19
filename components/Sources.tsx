import type { Source } from '@/lib/schemas';

type Props = { sources: Source[] };

export function Sources({ sources }: Props) {
  if (sources.length === 0) return null;
  return (
    <footer className="sources">
      <strong>Sources:</strong>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            {s.type === 'awoiaf' && s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                A Wiki of Ice and Fire ({s.license ?? 'CC-BY-SA-4.0'})
              </a>
            ) : (
              <span>{s.ref ?? s.url ?? s.type}</span>
            )}
          </li>
        ))}
      </ul>
    </footer>
  );
}
