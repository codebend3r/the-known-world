import { DesignSection } from "@/app/design/_sections/DesignSection";
import styles from "@/app/design/_sections/StructureRules.module.scss";

type Rule = { num: string; title: string; body: string };

const RULES = [
  {
    num: "01",
    title: "One gold, many house colours",
    body: "Gold is the only interface accent. House colour appears only where it identifies something: a banner, shield, swatch, or map pin. Never as a page theme.",
  },
  {
    num: "02",
    title: "Atmosphere, never wallpaper",
    body: "Background layers at 3.5 to 5% opacity: heraldic damask tile, compass rose, graticule, vignette. Static, always behind a vignette, painted once on the layout shell.",
  },
  {
    num: "03",
    title: "Mono means data",
    body: "Anything countable, dated, or categorical is uppercase mono with letter-spacing. Anything narrative is Spectral. No exceptions.",
  },
  {
    num: "04",
    title: "Hairline, then glow",
    body: "Rest is a 1px gold hairline. Hover promotes it to solid gold and adds a soft gold drop-glow. No transforms, no scale.",
  },
  {
    num: "05",
    title: "Every page is a plate",
    body: "Eyebrow label, display title, rule, then content. A mono colophon below, all inside the 1240px measure and its 56px gutter.",
  },
  {
    num: "06",
    title: "Shields are the motif",
    body: "The shield clip-path repeats at every scale, from a 14px swatch to a 154px hero banner.",
  },
] as const satisfies readonly Rule[];

export function StructureRules() {
  return (
    <DesignSection
      heading="05 · Structure & rules"
      lede="What makes a page belong to this atlas."
    >
      <ul className={styles.ruleGrid}>
        {RULES.map((rule) => (
          <li key={rule.num} className={styles.rule}>
            <span className={styles.ruleNum}>{rule.num}</span>
            <span className={styles.ruleTitle}>{rule.title}</span>
            <span className={styles.ruleBody}>{rule.body}</span>
          </li>
        ))}
      </ul>
    </DesignSection>
  );
}
