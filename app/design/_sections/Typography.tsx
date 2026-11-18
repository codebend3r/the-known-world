import type { DesignTokens } from "@/lib/design-tokens";
import { DesignSection } from "@/app/design/_sections/DesignSection";
import styles from "@/app/design/_sections/Typography.module.scss";

type Face = {
  role: string;
  family: string;
  weights: string;
  use: string;
  className: string;
};

const FACES = [
  {
    role: "Display",
    family: "Cormorant Garamond",
    weights: "500 · 600 · 700",
    use: "Titles, house names, section headings, numerals in shields.",
    className: styles.faceDisplay,
  },
  {
    role: "Body",
    family: "Spectral",
    weights: "300 · 400 · 300 italic",
    use: "Article text, blurbs, infobox values, house words in italic.",
    className: styles.faceBody,
  },
  {
    role: "Mono",
    family: "JetBrains Mono",
    weights: "400 · 500",
    use: "Eyebrows, nav, years, counts, status pills, plate numbers. Always uppercase, always letter-spaced.",
    className: styles.faceMono,
  },
] as const satisfies readonly Face[];

type ScaleRow = {
  token: `--fs-${string}`;
  sample: string;
  face: string;
  lineHeight: `--lh-${string}` | null;
  tracking: `--ls-${string}` | null;
  className: string;
};

const SCALE = [
  {
    token: "--fs-display",
    sample: "The Known World",
    face: "Cormorant 600",
    lineHeight: "--lh-display",
    tracking: null,
    className: styles.sampleDisplay,
  },
  {
    token: "--fs-h1",
    sample: "The Roll of Houses",
    face: "Cormorant 600",
    lineHeight: "--lh-title",
    tracking: null,
    className: styles.sampleH1,
  },
  {
    token: "--fs-h2",
    sample: "House Stark of Winterfell",
    face: "Cormorant 600",
    lineHeight: null,
    tracking: null,
    className: styles.sampleH2,
  },
  {
    token: "--fs-section",
    sample: "▚ HISTORY",
    face: "JetBrains 500",
    lineHeight: null,
    tracking: "--ls-section",
    className: styles.sampleSection,
  },
  {
    token: "--fs-body",
    sample: "House Stark is one of the Great Houses of Westeros.",
    face: "Spectral 300",
    lineHeight: "--lh-body",
    tracking: null,
    className: styles.sampleBody,
  },
  {
    token: "--fs-quote",
    sample: "“Winter Is Coming”",
    face: "Spectral 300 italic",
    lineHeight: null,
    tracking: null,
    className: styles.sampleQuote,
  },
  {
    token: "--fs-label",
    sample: "SEAT · REGION · FOUNDED",
    face: "JetBrains 400",
    lineHeight: null,
    tracking: "--ls-label",
    className: styles.sampleLabel,
  },
] as const satisfies readonly ScaleRow[];

function scaleSpec({
  row,
  tokens,
}: {
  row: ScaleRow;
  tokens: DesignTokens;
}): string {
  const size = tokens.value(row.token);
  const sizing = row.lineHeight
    ? `${size} / ${tokens.value(row.lineHeight)}`
    : size;
  return [
    row.face,
    sizing,
    ...(row.tracking ? [tokens.value(row.tracking)] : []),
  ].join(" · ");
}

export function Typography({ tokens }: { tokens: DesignTokens }) {
  return (
    <DesignSection
      heading="03 · Type"
      lede={
        <>
          Three faces, three jobs. Display sets every title; body sets every
          paragraph; mono sets every label, year, and datum.
        </>
      }
    >
      <ul className={styles.faceGrid}>
        {FACES.map((face) => (
          <li key={face.role} className={styles.face}>
            <span className={styles.faceRole}>{face.role}</span>
            <span className={face.className}>{face.family}</span>
            <span className={styles.faceWeights}>{face.weights}</span>
            <span className={styles.faceUse}>{face.use}</span>
          </li>
        ))}
      </ul>
      <dl className={styles.scale}>
        {SCALE.map((row) => (
          <div key={row.token} className={styles.scaleRow}>
            <dt className={styles.scaleToken}>
              <code>{row.token}</code>
            </dt>
            <dd className={styles.scaleSample}>
              <span className={row.className}>{row.sample}</span>
            </dd>
            <dd className={styles.scaleSpec}>{scaleSpec({ row, tokens })}</dd>
          </div>
        ))}
      </dl>
    </DesignSection>
  );
}
