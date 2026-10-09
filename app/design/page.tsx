import type { Metadata } from "next";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { loadDesignTokens, type DesignTokens } from "@/lib/design-tokens";
import styles from "@/app/design/page.module.scss";

export const metadata: Metadata = {
  title: "Design System · Atlas of the Known World",
  description:
    "Iron Throne v1: the tokens, type, and components of the Known World, on a forge-black ground with one molten-gold accent.",
};

// The in-repo catalogue of Iron Throne v1. Colour values, type specs, and the
// token listing are read from `styles/globals.scss` at build time, so a retuned
// token shows up here without an edit and a renamed one fails the build. Only
// names, uses, and samples live in this file.

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

type Heraldry = {
  name: string;
  initial: string;
  token: string;
};

// House colour is data, not decoration: it identifies a banner, shield, swatch,
// or map pin and never themes a page. Each `token` has `-metal` and `-ink`
// siblings for the shield rim and charge.
const HOUSE_PALETTE = [
  {
    name: "Stark",
    initial: "S",
    token: "--house-stark",
  },
  {
    name: "Targaryen",
    initial: "T",
    token: "--house-targaryen",
  },
  {
    name: "Lannister",
    initial: "L",
    token: "--house-lannister",
  },
  {
    name: "Baratheon",
    initial: "B",
    token: "--house-baratheon",
  },
  {
    name: "Tully",
    initial: "T",
    token: "--house-tully",
  },
  {
    name: "Tyrell",
    initial: "T",
    token: "--house-tyrell",
  },
  {
    name: "Arryn",
    initial: "A",
    token: "--house-arryn",
  },
  {
    name: "Martell",
    initial: "M",
    token: "--house-martell",
  },
  {
    name: "Greyjoy",
    initial: "G",
    token: "--house-greyjoy",
  },
  {
    name: "Bolton",
    initial: "B",
    token: "--house-bolton",
  },
] as const satisfies readonly Heraldry[];

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

type Status = { label: string; className: string };

const STATUSES = [
  { label: "Extant", className: styles.pillExtant },
  { label: "Deposed", className: styles.pillDeposed },
  { label: "Contested", className: styles.pillContested },
  { label: "Attainted", className: styles.pillAttainted },
  { label: "Extinct", className: styles.pillExtinct },
] as const satisfies readonly Status[];

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

type PageEntry = { href: string; kind: string; title: string; blurb: string };

const PAGES = [
  {
    href: "/",
    kind: "Home",
    title: "Atlas Home",
    blurb: "Display hero over the collection index.",
  },
  {
    href: "/maps/",
    kind: "Maps",
    title: "World Map",
    blurb: "Deep-well plate, gold-ringed pins, layer chips.",
  },
  {
    href: "/timeline/",
    kind: "Timeline",
    title: "The Long Chronicle",
    blurb: "Era bands over a gold spine.",
  },
  {
    href: "/houses/",
    kind: "Index",
    title: "The Roll of Houses",
    blurb: "Live search, rank filter, register rows.",
  },
  {
    href: "/houses/stark/",
    kind: "Detail",
    title: "House Stark",
    blurb: "Banner infobox, family tree, bannermen.",
  },
  {
    href: "/characters/eddard-stark/",
    kind: "Detail",
    title: "Eddard Stark",
    blurb: "Portrait plate, particulars, relations.",
  },
  {
    href: "/battles/",
    kind: "Register",
    title: "The Fields of War",
    blurb: "War bands over dated battle rows.",
  },
  {
    href: "/castles/",
    kind: "Register",
    title: "Seats and Strongholds",
    blurb: "Type bands over held-by rows.",
  },
  {
    href: "/weapons/",
    kind: "Index",
    title: "Named Blades",
    blurb: "Search over a single-column register.",
  },
] as const satisfies readonly PageEntry[];

export default async function DesignPage() {
  const tokens = await loadDesignTokens();

  return (
    <PlateLayout>
      <PageHeading
        title="The Iron Throne System"
        eyebrow="Design system · Iron Throne v1"
        subtitle="Tokens, type, and components for The Known World. Forge-black ground, molten gold, heraldic house colour. Every value below is declared in styles/globals.scss."
      />

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>01 · Core palette</h2>
        <p className={styles.sectionLede}>
          Two backgrounds, one accent metal, one type ramp. Nothing else earns a
          place.
        </p>
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
                <code className={styles.swatchToken}>{swatch.token}</code>
                <span className={styles.swatchUse}>{swatch.use}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>02 · Heraldic colour</h2>
        <p className={styles.sectionLede}>
          House and region colour is <em>data</em>, not decoration. It
          identifies; it never themes the page. Use it on banners, shields,
          swatches, and pins only.
        </p>
        <ul className={styles.heraldryGrid}>
          {HOUSE_PALETTE.map((house) => (
            <li key={house.token} className={styles.heraldry}>
              <span
                className={styles.shield}
                style={{
                  "--shield-bg": `var(${house.token})`,
                  "--shield-metal": `var(${house.token}-metal)`,
                  "--shield-ink": `var(${house.token}-ink)`,
                }}
                aria-hidden="true"
              >
                {house.initial}
              </span>
              <span className={styles.heraldryName}>{house.name}</span>
              <code className={styles.swatchToken}>{house.token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>03 · Type</h2>
        <p className={styles.sectionLede}>
          Three faces, three jobs. Display sets every title; body sets every
          paragraph; mono sets every label, year, and datum.
        </p>
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
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>04 · Components</h2>
        <p className={styles.sectionLede}>
          The kit used across the atlas. Every surface is{" "}
          <code className={styles.inlineCode}>--tkw-surface</code> on a 1px gold
          hairline; hover lifts the hairline to solid gold and adds the glow.
        </p>
        <div className={styles.demoGrid}>
          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>
              House banner · hero, index rail
            </h3>
            <div className={styles.demoStage}>
              <span
                className={styles.banner}
                style={{
                  "--shield-bg": "var(--house-stark)",
                  "--shield-metal": "var(--house-stark-metal)",
                  "--shield-ink": "var(--house-stark-ink)",
                }}
              >
                <span className={styles.bannerMark}>S</span>
                <span className={styles.bannerName}>Stark</span>
                <span className={styles.bannerWords}>Winter Is Coming</span>
              </span>
              <span
                className={styles.banner}
                style={{
                  "--shield-bg": "var(--house-lannister)",
                  "--shield-metal": "var(--house-lannister-metal)",
                  "--shield-ink": "var(--house-lannister-ink)",
                }}
              >
                <span className={styles.bannerMark}>L</span>
                <span className={styles.bannerName}>Lannister</span>
                <span className={styles.bannerWords}>Hear Me Roar</span>
              </span>
            </div>
          </section>

          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>Collection card · home index</h3>
            <div className={styles.demoStage}>
              <span className={styles.card}>
                <span className={styles.cardHead}>
                  <svg
                    viewBox="0 0 24 24"
                    width="25"
                    height="25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3l7 2.6v6.2c0 4.2-3 7.4-7 9.2-4-1.8-7-5-7-9.2V5.6z"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.cardPlate}>03</span>
                </span>
                <span className={styles.cardTitle}>Houses</span>
                <span className={styles.cardBlurb}>
                  Read the rolls of the great and minor houses.
                </span>
                <span className={styles.cardEnter}>Houses →</span>
              </span>
            </div>
          </section>

          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>Register row · house index</h3>
            <div className={styles.demoStage}>
              <span className={styles.row}>
                <span
                  className={styles.rowShield}
                  style={{
                    "--shield-bg": "var(--house-tully)",
                    "--shield-metal": "var(--house-tully-metal)",
                    "--shield-ink": "var(--house-tully-metal)",
                  }}
                >
                  T
                </span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>
                    <span className={styles.rowName}>Tully</span>
                    <span className={styles.rowRegion}>Riverlands</span>
                  </span>
                  <span className={styles.rowWords}>“Family, Duty, Honor”</span>
                  <span className={styles.rowSeat}>Seat of Riverrun</span>
                  <span className={cx(styles.pill, styles.pillAttainted)}>
                    Attainted
                  </span>
                </span>
              </span>
            </div>
          </section>

          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>Infobox · all detail pages</h3>
            <div className={styles.demoStage}>
              <span className={styles.infobox}>
                <span className={styles.infoboxCaption}>House Stark</span>
                <dl className={styles.infoboxRows}>
                  <div className={styles.infoboxRow}>
                    <dt>Seat</dt>
                    <dd>Winterfell</dd>
                  </div>
                  <div className={styles.infoboxRow}>
                    <dt>Region</dt>
                    <dd>The North</dd>
                  </div>
                  <div className={styles.infoboxRow}>
                    <dt>Founded</dt>
                    <dd>Age of Heroes</dd>
                  </div>
                </dl>
              </span>
            </div>
          </section>

          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>
              Filter chips &amp; status pills
            </h3>
            <div className={styles.demoStage}>
              <span className={styles.chipRow}>
                <span className={cx(styles.chip, styles.chipOn)}>
                  All regions
                </span>
                <span className={styles.chip}>The North</span>
                <span className={styles.chip}>Dorne</span>
              </span>
              <span className={styles.chipRow}>
                {STATUSES.map((status) => (
                  <span
                    key={status.label}
                    className={cx(styles.pill, status.className)}
                  >
                    {status.label}
                  </span>
                ))}
              </span>
            </div>
          </section>

          <section className={styles.demo}>
            <h3 className={styles.demoLabel}>Search field &amp; pull quote</h3>
            <div className={styles.demoStage}>
              <span className={styles.searchDemo}>
                Search houses, seats, or words…
              </span>
              <blockquote className={styles.quote}>
                <p className={styles.quoteText}>
                  “The man who passes the sentence should swing the sword.”
                </p>
                <cite className={styles.quoteCite}>Eddard Stark</cite>
              </blockquote>
            </div>
          </section>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>05 · Structure &amp; rules</h2>
        <p className={styles.sectionLede}>
          What makes a page belong to this atlas.
        </p>
        <ul className={styles.ruleGrid}>
          {RULES.map((rule) => (
            <li key={rule.num} className={styles.rule}>
              <span className={styles.ruleNum}>{rule.num}</span>
              <span className={styles.ruleTitle}>{rule.title}</span>
              <span className={styles.ruleBody}>{rule.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>06 · Tokens for the repo</h2>
        <p className={styles.sectionLede}>
          Declared in{" "}
          <code className={styles.inlineCode}>styles/globals.scss</code>.
          Consume them with{" "}
          <code className={styles.inlineCode}>var(--token)</code>; never
          hard-code a hex in a module.
        </p>
        <pre className={styles.tokens}>
          <code>{tokens.source}</code>
        </pre>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>07 · The pages</h2>
        <ul className={styles.pageGrid}>
          {PAGES.map((page) => (
            <li key={page.href} className={styles.pageItem}>
              <Link href={page.href} className={styles.pageCard}>
                <span className={styles.pageKind}>{page.kind}</span>
                <span className={styles.pageTitle}>{page.title}</span>
                <span className={styles.pageBlurb}>{page.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PlateLayout>
  );
}
