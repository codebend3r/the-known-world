import type { CSSProperties } from 'react';

const SIGIL_SLUGS = new Set([
  'stark', 'lannister', 'targaryen', 'baratheon', 'greyjoy',
  'tully', 'arryn', 'martell', 'tyrell', 'bolton',
  'frey', 'mormont', 'umber', 'karstark', 'reed',
  'hightower', 'velaryon', 'tarly', 'blackwood', 'bracken',
  'dayne', 'yronwood', 'royce', 'corbray', 'redwyne',
  'florent', 'rowan', 'oakheart', 'mallister', 'piper',
  'manderly', 'dustin', 'ryswell', 'hornwood', 'cerwyn',
  'swann', 'dondarrion', 'caron', 'estermont', 'grafton',
  'durrandon', 'unknown',
]);

type Props = {
  slug: string | null;
  name: string;
  size?: string;
  decorative?: boolean;
  className?: string;
};

export function Sigil({ slug, name, size, decorative = false, className }: Props) {
  if (slug === null) return null;

  const resolvedSlug = SIGIL_SLUGS.has(slug) ? slug : 'unknown';
  const classes = ['sigil', `sigil--${resolvedSlug}`, className].filter(Boolean).join(' ');
  const style = size ? ({ '--sigil-size': size } as CSSProperties) : undefined;

  return (
    <span
      className={classes}
      style={style}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : `Sigil of House ${name}`}
      aria-hidden={decorative || undefined}
    />
  );
}
