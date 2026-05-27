import { hasSigil, getSigilSrc } from '@/lib/sigils';

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
  if (!hasSigil(houseSlug)) return null;

  const height = typeof size === 'number' ? `${size}px` : size;
  const classes = ['sigil', className].filter(Boolean).join(' ');

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export with `images.unoptimized`; sigils have per-house intrinsic dimensions
    <img
      className={classes}
      src={getSigilSrc(houseSlug)}
      alt={decorative ? '' : `Sigil of House ${houseName}`}
      role={decorative ? 'presentation' : undefined}
      aria-hidden={decorative || undefined}
      style={{ height }}
    />
  );
}
