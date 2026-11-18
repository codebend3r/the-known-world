import { cx } from "@/lib/cx";
import { formatTitle, labelBox } from "@/lib/family-tree-label";
import {
  LAYOUT_CONSTANTS,
  isLinkable,
  type LayoutPerson,
} from "@/lib/family-tree-layout";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;

// Width matches DOT_R * 2 * devicePixelRatio for retina (~56 css px -> request 96 source px).
// Netlify image CDN serves resized/compressed copies of the originals in `/public/characters/*`.
const PORTRAIT_SOURCE_WIDTH = 96;
const PORTRAIT_QUALITY = 75;

function optimizedPortrait(path: string): string {
  if (process.env.NODE_ENV !== "production") return path;
  const params = new URLSearchParams({
    url: path,
    w: String(PORTRAIT_SOURCE_WIDTH),
    q: String(PORTRAIT_QUALITY),
  });
  return `/.netlify/images?${params.toString()}`;
}

export function portraitClipId({
  clipPrefix,
  slug,
}: {
  clipPrefix: string;
  slug: string;
}): string {
  return `${clipPrefix}-clip-${slug}`;
}

type Props = {
  person: LayoutPerson;
  clipPrefix: string;
};

/**
 * One person on the chart: dot, portrait, and label, wrapped in a link to the
 * character page when there is one to go to, otherwise in a plain group.
 */
export function PersonNode({ person: p, clipPrefix }: Props) {
  const label = labelBox({
    x: p.x,
    y: p.y,
    dotRadius: DOT_R,
    name: p.name,
    titles: p.titles,
  });
  const content = (
    <>
      <title>{formatTitle({ name: p.name, alias: p.alias })}</title>
      <circle
        data-person
        cx={p.x}
        cy={p.y}
        r={DOT_R}
        className={cx(
          styles.dot,
          p.isPlaceholder && styles.dotPlaceholder,
          p.isExternal && styles.dotExternal,
        )}
      />
      {p.portrait !== null && (
        <image
          href={optimizedPortrait(p.portrait)}
          x={p.x - DOT_R}
          y={p.y - DOT_R}
          width={DOT_R * 2}
          height={DOT_R * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${portraitClipId({ clipPrefix, slug: p.slug })})`}
          // The `<title>` beside it already names the person; an unhidden
          // `<image>` would announce a second, nameless graphic on every node.
          aria-hidden="true"
        />
      )}
      <rect
        className={styles.labelBg}
        x={label.rect.x}
        y={label.rect.y}
        width={label.rect.width}
        height={label.rect.height}
        data-label-bg
      />
      <text className={styles.label} x={label.x} y={label.baseline}>
        {label.text}
      </text>
    </>
  );

  if (
    isLinkable({
      isPlaceholder: p.isPlaceholder,
      characterSlug: p.characterSlug,
    })
  ) {
    return <a href={`/characters/${p.characterSlug}/`}>{content}</a>;
  }
  return <g>{content}</g>;
}
