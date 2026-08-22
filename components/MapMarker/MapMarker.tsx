import type { ReactElement } from "react";
import { cx } from "@/lib/cx";
import { placementHref, type MapLayer } from "@/lib/map";
import styles from "@/components/MapMarker/MapMarker.module.scss";

type Props = {
  slug: string;
  name: string;
  type: MapLayer;
  cx: number;
  cy: number;
};

export function MapMarker({
  slug,
  name,
  type,
  cx: centreX,
  cy: centreY,
}: Props) {
  return (
    <a
      href={placementHref({ layer: type, slug })}
      className={styles.marker}
      tabIndex={0}
      aria-label={name}
    >
      <Glyph type={type} cx={centreX} cy={centreY} />
      <text className={styles.label} x={centreX + 10} y={centreY + 4}>
        {name}
      </text>
    </a>
  );
}

// The pin's fill identifies the kind of place; the ring is gold for every one
// of them. Both live in the module, so no hex is written here. Battle and
// event glyphs break the shape family on purpose (a filled triangle, a hollow
// diamond) so a happening is never mistaken for a seat.
function Glyph({
  type,
  cx: centreX,
  cy: centreY,
}: {
  type: MapLayer;
  cx: number;
  cy: number;
}): ReactElement {
  switch (type) {
    case "castle":
      return (
        <circle
          className={cx(styles.glyph, styles.castle)}
          cx={centreX}
          cy={centreY}
          r={6}
        />
      );
    case "town":
      return (
        <circle
          className={cx(styles.glyph, styles.town)}
          cx={centreX}
          cy={centreY}
          r={4}
        />
      );
    case "ruin":
      return (
        <g className={cx(styles.glyph, styles.ruin)}>
          <line
            x1={centreX - 5}
            y1={centreY - 5}
            x2={centreX + 5}
            y2={centreY + 5}
          />
          <line
            x1={centreX + 5}
            y1={centreY - 5}
            x2={centreX - 5}
            y2={centreY + 5}
          />
        </g>
      );
    case "watchtower":
      return (
        <g className={cx(styles.glyph, styles.watchtower)}>
          <rect x={centreX - 3} y={centreY - 7} width={6} height={14} />
          <rect x={centreX - 5} y={centreY - 9} width={10} height={3} />
        </g>
      );
    case "holdfast":
      return (
        <rect
          className={cx(styles.glyph, styles.holdfast)}
          x={centreX - 5}
          y={centreY - 5}
          width={10}
          height={10}
        />
      );
    case "battle":
      return (
        <polygon
          className={cx(styles.glyph, styles.battle)}
          points={`${centreX},${centreY - 7} ${centreX + 6},${centreY + 5} ${centreX - 6},${centreY + 5}`}
        />
      );
    case "event":
      return (
        <polygon
          className={cx(styles.glyph, styles.event)}
          points={`${centreX},${centreY - 7} ${centreX + 7},${centreY} ${centreX},${centreY + 7} ${centreX - 7},${centreY}`}
        />
      );
  }
}
