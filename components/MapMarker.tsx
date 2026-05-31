import type { Castle } from "@/lib/schemas";
import styles from "@/components/MapMarker.module.css";

type Props = {
  slug: string;
  name: string;
  type: Castle["type"];
  cx: number;
  cy: number;
};

export function MapMarker({ slug, name, type, cx, cy }: Props) {
  return (
    <a
      href={`/castles/${slug}/`}
      className={styles.marker}
      tabIndex={0}
      aria-label={name}
    >
      <Glyph type={type} cx={cx} cy={cy} />
      <text className={styles.label} x={cx + 10} y={cy + 4}>
        {name}
      </text>
    </a>
  );
}

function Glyph({
  type,
  cx,
  cy,
}: {
  type: Castle["type"];
  cx: number;
  cy: number;
}) {
  switch (type) {
    case "castle":
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#8b1a1a"
          stroke="#3d2817"
          strokeWidth={1.5}
        />
      );
    case "town":
      return (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="#f8ecd0"
          stroke="#3d2817"
          strokeWidth={1.5}
        />
      );
    case "ruin":
      return (
        <g>
          <line
            x1={cx - 5}
            y1={cy - 5}
            x2={cx + 5}
            y2={cy + 5}
            stroke="#3d2817"
            strokeWidth={2}
          />
          <line
            x1={cx + 5}
            y1={cy - 5}
            x2={cx - 5}
            y2={cy + 5}
            stroke="#3d2817"
            strokeWidth={2}
          />
        </g>
      );
    case "watchtower":
      return (
        <g>
          <rect x={cx - 3} y={cy - 7} width={6} height={14} fill="#3d2817" />
          <rect x={cx - 5} y={cy - 9} width={10} height={3} fill="#3d2817" />
        </g>
      );
    case "holdfast":
      return (
        <rect
          x={cx - 5}
          y={cy - 5}
          width={10}
          height={10}
          fill="#8b1a1a"
          stroke="#3d2817"
          strokeWidth={1.5}
        />
      );
  }
}
