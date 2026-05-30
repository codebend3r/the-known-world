import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import styles from './Sigil.module.css';

const SIGIL_SLUGS = new Set([
  'stark', 'lannister', 'targaryen', 'baratheon', 'greyjoy',
  'tully', 'arryn', 'martell', 'tyrell', 'bolton',
  'frey', 'mormont', 'umber', 'karstark', 'reed',
  'hightower', 'velaryon', 'tarly', 'blackwood', 'bracken',
  'dayne', 'yronwood', 'royce', 'corbray', 'redwyne',
  'florent', 'rowan', 'oakheart', 'mallister', 'piper',
  'manderly', 'dustin', 'ryswell', 'hornwood', 'cerwyn',
  'celtigar', 'chester', 'crakehall', 'glover', 'reyne', 'selmy', 'wyl',
  'swann', 'dondarrion', 'caron', 'estermont', 'grafton',
  'tarth', 'durrandon', 'unknown',
]);

const REGION_CLASS: Record<string, string | undefined> = {
  north: styles.regionNorth,
  vale: styles.regionVale,
  riverlands: styles.regionRiverlands,
  westerlands: styles.regionWesterlands,
  reach: styles.regionReach,
  stormlands: styles.regionStormlands,
  dorne: styles.regionDorne,
  'iron-islands': styles.regionIronIslands,
  crownlands: styles.regionCrownlands,
};

type Props = {
  slug: string | null;
  name: string;
  region?: string | null;
  size?: string;
  decorative?: boolean;
  className?: string;
};

export function Sigil({ slug, name, region, size, decorative = false, className }: Props) {
  if (slug === null) return null;

  const variantClass = SIGIL_SLUGS.has(slug)
    ? styles[slug]
    : (region && REGION_CLASS[region]) ?? styles.unknown;
  const classes = cx(styles.sigil, variantClass, className);
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
