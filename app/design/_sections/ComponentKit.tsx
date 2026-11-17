import { cx } from "@/lib/cx";
import { DesignSection } from "@/app/design/_sections/DesignSection";
import { shieldVars } from "@/app/design/_sections/shield-vars";
import shared from "@/app/design/_sections/DesignSection.module.scss";
import styles from "@/app/design/_sections/ComponentKit.module.scss";

type Status = { label: string; className: string };

const STATUSES = [
  { label: "Extant", className: styles.pillExtant },
  { label: "Deposed", className: styles.pillDeposed },
  { label: "Contested", className: styles.pillContested },
  { label: "Attainted", className: styles.pillAttainted },
  { label: "Extinct", className: styles.pillExtinct },
] as const satisfies readonly Status[];

export function ComponentKit() {
  return (
    <DesignSection
      heading="04 · Components"
      lede={
        <>
          The kit used across the atlas. Every surface is{" "}
          <code className={shared.inlineCode}>--tkw-surface</code> on a 1px gold
          hairline; hover lifts the hairline to solid gold and adds the glow.
        </>
      }
    >
      <div className={styles.demoGrid}>
        <section className={styles.demo}>
          <h3 className={styles.demoLabel}>House banner · hero, index rail</h3>
          <div className={styles.demoStage}>
            <span
              className={styles.banner}
              style={shieldVars({ token: "--house-stark" })}
            >
              <span className={styles.bannerMark}>S</span>
              <span className={styles.bannerName}>Stark</span>
              <span className={styles.bannerWords}>Winter Is Coming</span>
            </span>
            <span
              className={styles.banner}
              style={shieldVars({ token: "--house-lannister" })}
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
                style={shieldVars({
                  token: "--house-tully",
                  ink: "--house-tully-metal",
                })}
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
          <h3 className={styles.demoLabel}>Filter chips &amp; status pills</h3>
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
    </DesignSection>
  );
}
