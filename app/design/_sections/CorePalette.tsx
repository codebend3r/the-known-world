import type { DesignTokens } from "@/lib/design-tokens";
import { DesignSection } from "@/app/design/_sections/DesignSection";
import shared from "@/app/design/_sections/DesignSection.module.scss";
import styles from "@/app/design/_sections/CorePalette.module.scss";

type Swatch = {
  token: string;
  name: string;
  use: string;
};

const CORE_PALETTE = [
  {
    name: "Forge Black",
    token: "--tkw-bg",
    use: "Page ground. Every screen starts here.",
  },
  {
    name: "Pitch",
    token: "--tkw-bg-deep",
    use: "Code blocks, map wells, page edges.",
  },
  {
    name: "Ember Surface",
    token: "--tkw-surface",
    use: "Cards, infoboxes, chips, search fields.",
  },
  {
    name: "Molten Gold",
    token: "--tkw-gold",
    use: "The one accent: rules, labels, hairlines, links.",
  },
  {
    name: "Bright Gold",
    token: "--tkw-gold-bright",
    use: "Wordmark, active nav, hover state.",
  },
  {
    name: "Parchment",
    token: "--tkw-ink",
    use: "Titles and primary text on dark.",
  },
  {
    name: "Vellum",
    token: "--tkw-ink-body",
    use: "Article body copy.",
  },
  {
    name: "Ash",
    token: "--tkw-ink-muted",
    use: "Blurbs, secondary values, inactive nav.",
  },
] as const satisfies readonly Swatch[];

export function CorePalette({ tokens }: { tokens: DesignTokens }) {
  return (
    <DesignSection
      heading="01 · Core palette"
      lede={
        <>
          Two backgrounds, one accent metal, one type ramp. Nothing else earns a
          place.
        </>
      }
    >
      <ul className={styles.paletteGrid}>
        {CORE_PALETTE.map((swatch) => (
          <li key={swatch.token} className={styles.swatch}>
            <span
              className={styles.swatchChip}
              style={{ "--swatch": `var(${swatch.token})` }}
              aria-hidden="true"
            />
            <span className={styles.swatchBody}>
              <span className={styles.swatchName}>{swatch.name}</span>
              <span className={styles.swatchHex}>
                {tokens.value(swatch.token)}
              </span>
              <code className={shared.swatchToken}>{swatch.token}</code>
              <span className={styles.swatchUse}>{swatch.use}</span>
            </span>
          </li>
        ))}
      </ul>
    </DesignSection>
  );
}
