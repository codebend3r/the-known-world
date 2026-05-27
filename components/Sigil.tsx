import { getSigilCell, getSigilBackgroundPosition } from '@/lib/sigils';

interface SigilProps {
  houseSlug: string;
  houseName: string;
  size?: number | string;
  className?: string;
  decorative?: boolean;
}

export function Sigil({
  houseSlug,
  houseName,
  size = '4rem',
  className,
  decorative = false,
}: SigilProps) {
  const cell = getSigilCell(houseSlug);
  if (!cell) return null;

  const width = typeof size === 'number' ? `${size}px` : size;
  const classes = ['sigil', className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : `Sigil of House ${houseName}`}
      aria-hidden={decorative || undefined}
      style={{
        width,
        backgroundPosition: getSigilBackgroundPosition(cell),
      }}
    />
  );
}
