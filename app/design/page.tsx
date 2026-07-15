import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { FiligreeRule } from "@/components/Filigree";
import styles from "@/app/design/page.module.scss";

export const metadata: Metadata = {
  title: "Design System · Atlas of the Known World",
  description:
    "The visual grammar of the Known World: colour, type, spacing, and every control on the bench.",
};

type Swatch = { token: string; hex: string; name: string };

// The core palette and regional heraldic tints, mirrored from the design
// tokens declared in `styles/globals.scss`. This page is the living catalogue
// of those tokens; keep it in step when a token is added or renamed there.
const CORE_PALETTE: Swatch[] = [
  { token: "--coal", hex: "#14100a", name: "Coal" },
  { token: "--iron", hex: "#1d1712", name: "Iron" },
  { token: "--gunmetal", hex: "#271f16", name: "Gunmetal" },
  { token: "--gunmetal-raised", hex: "#322818", name: "Raised Gunmetal" },
  { token: "--steel", hex: "#4a3b2b", name: "Steel" },
  { token: "--brass", hex: "#b0813a", name: "Brass" },
  { token: "--brass-bright", hex: "#e4bf78", name: "Bright Brass" },
  { token: "--brass-dark", hex: "#77571f", name: "Dark Brass" },
  { token: "--verdigris", hex: "#79a48c", name: "Verdigris" },
  { token: "--verdigris-dim", hex: "#435f4e", name: "Deep Verdigris" },
  { token: "--copper", hex: "#c1704a", name: "Copper" },
  { token: "--gaslight", hex: "#f0e7d2", name: "Gaslight" },
  { token: "--gaslight-dim", hex: "#bfb096", name: "Dim Gaslight" },
  { token: "--gaslight-faint", hex: "#8f8069", name: "Faint Gaslight" },
  { token: "--ember", hex: "#d05a3e", name: "Ember" },
];

const REGION_PALETTE: Swatch[] = [
  { token: "--region-color-north", hex: "#92a6b0", name: "North" },
  { token: "--region-color-vale", hex: "#7ba3c4", name: "Vale" },
  { token: "--region-color-riverlands", hex: "#6b89a8", name: "Riverlands" },
  { token: "--region-color-westerlands", hex: "#c25c50", name: "Westerlands" },
  { token: "--region-color-reach", hex: "#93a854", name: "Reach" },
  { token: "--region-color-stormlands", hex: "#d3a94e", name: "Stormlands" },
  { token: "--region-color-dorne", hex: "#cd7f4b", name: "Dorne" },
  {
    token: "--region-color-iron-islands",
    hex: "#6d9186",
    name: "Iron Islands",
  },
  { token: "--region-color-crownlands", hex: "#ad5c62", name: "Crownlands" },
];

type FontRole = { family: string; label: string; sample: string };

const FONT_ROLES: FontRole[] = [
  {
    family: "var(--font-heading)",
    label: "Bevan · Headings",
    sample: "The Known World",
  },
  {
    family: "var(--font-character-name)",
    label: "Graduate · Nameplates",
    sample: "Eddard Stark",
  },
  {
    family: "var(--font-body)",
    label: "Old Standard TT · Body",
    sample: "The night is dark and full of terrors.",
  },
  {
    family: "var(--font-sans)",
    label: "Oswald · Labels & data",
    sample: "298 AC · 42 houses · 9 regions",
  },
];

type Space = { step: string; rem: string; px: string };

// The de facto spacing ramp used across the modules (gaps and padding are
// authored in these rem steps). Space and align with `gap`/`padding`, never
// with margins.
const SPACING: Space[] = [
  { step: "2xs", rem: "0.25rem", px: "4px" },
  { step: "xs", rem: "0.5rem", px: "8px" },
  { step: "sm", rem: "0.75rem", px: "12px" },
  { step: "md", rem: "1rem", px: "16px" },
  { step: "lg", rem: "1.5rem", px: "24px" },
  { step: "xl", rem: "2rem", px: "32px" },
  { step: "2xl", rem: "3rem", px: "48px" },
];

type InputField = {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
};

const TEXT_FIELDS: InputField[] = [
  {
    id: "df-text",
    label: "Text",
    type: "text",
    placeholder: "House Stark of Winterfell",
  },
  {
    id: "df-search",
    label: "Search",
    type: "search",
    placeholder: "Search the rolls…",
  },
  {
    id: "df-email",
    label: "Email",
    type: "email",
    placeholder: "maester@citadel.oldtown",
    autoComplete: "email",
  },
  {
    id: "df-password",
    label: "Password",
    type: "password",
    defaultValue: "valarmorghulis",
    autoComplete: "current-password",
  },
  {
    id: "df-number",
    label: "Number",
    type: "number",
    defaultValue: "300",
    min: 0,
    max: 8000,
    step: 10,
    hint: "The Wall stands 700 feet tall.",
  },
  { id: "df-tel", label: "Telephone", type: "tel", placeholder: "000-RAVEN" },
  {
    id: "df-url",
    label: "URL",
    type: "url",
    placeholder: "https://citadel.oldtown",
  },
];

const DATETIME_FIELDS: InputField[] = [
  { id: "df-date", label: "Date", type: "date", defaultValue: "0298-04-17" },
  { id: "df-time", label: "Time", type: "time", defaultValue: "07:30" },
  {
    id: "df-datetime",
    label: "Date & time",
    type: "datetime-local",
    defaultValue: "0298-04-17T07:30",
  },
  { id: "df-month", label: "Month", type: "month", defaultValue: "0298-04" },
  { id: "df-week", label: "Week", type: "week", defaultValue: "0298-W16" },
];

const CHECKBOXES: { id: string; label: string; checked?: boolean }[] = [
  { id: "df-map-castles", label: "Castles", checked: true },
  { id: "df-map-battles", label: "Battle sites" },
  { id: "df-map-roads", label: "Kingsroad & rivers" },
  { id: "df-map-regions", label: "Regional borders", checked: true },
  { id: "df-map-ruins", label: "Ruins" },
];

const RADIOS: { id: string; label: string; checked?: boolean }[] = [
  { id: "df-sort-name", label: "Name", checked: true },
  { id: "df-sort-region", label: "Region" },
  { id: "df-sort-rank", label: "Rank" },
  { id: "df-sort-year", label: "Founding year" },
];

const MULTI_OPTIONS: string[] = [
  "Winterfell",
  "Casterly Rock",
  "Storm's End",
  "Highgarden",
  "Sunspear",
  "The Eyrie",
  "Dragonstone",
];

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {children}
      {!!hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ParchmentLayout>
      <PageHeading
        title="Design System"
        subtitle="The visual grammar of the Known World: colour, type, spacing, and every control on the bench."
      />

      {/* ---------------------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="ds-colour">
        <h2 id="ds-colour">Colour</h2>
        <p className={styles.sectionIntro}>
          Every hue is a CSS custom property declared in{" "}
          <code className={styles.code}>styles/globals.scss</code>. Reference
          the token, never the raw hex.
        </p>

        <h3>Core palette</h3>
        <ul className={styles.swatchGrid}>
          {CORE_PALETTE.map((s) => (
            <li key={s.token} className={styles.swatch}>
              <span
                className={styles.swatchChip}
                style={{ backgroundColor: `var(${s.token})` }}
                aria-hidden="true"
              />
              <span className={styles.swatchMeta}>
                <span className={styles.swatchName}>{s.name}</span>
                <span className={styles.swatchToken}>{s.token}</span>
                <span className={styles.swatchHex}>{s.hex}</span>
              </span>
            </li>
          ))}
        </ul>

        <h3>Regional tints</h3>
        <ul className={styles.swatchGrid}>
          {REGION_PALETTE.map((s) => (
            <li key={s.token} className={styles.swatch}>
              <span
                className={styles.swatchChip}
                style={{ backgroundColor: `var(${s.token})` }}
                aria-hidden="true"
              />
              <span className={styles.swatchMeta}>
                <span className={styles.swatchName}>{s.name}</span>
                <span className={styles.swatchToken}>{s.token}</span>
                <span className={styles.swatchHex}>{s.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <FiligreeRule className={styles.divider} />

      {/* ---------------------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="ds-type">
        <h2 id="ds-type">Typography</h2>
        <p className={styles.sectionIntro}>
          Headings are struck in Bevan; body copy is set in Old Standard TT. The
          scale below renders each element exactly as the global stylesheet
          styles it.
        </p>

        <div className={styles.typeList}>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>H1 · 2rem</span>
            <h1>Winter Is Coming</h1>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>H2 · 1.2rem</span>
            <h2>The Great Houses</h2>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>H3 · 0.9rem</span>
            <h3>Wardens of the North</h3>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>H4</span>
            <h4>Sworn Bannermen</h4>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>H5</span>
            <h5>Hedge Knights</h5>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>Body · 1.25rem</span>
            <p>
              A maester forges his chain in the Citadel of Oldtown, each link a
              different metal for a different art. He keeps the ravens, tends
              the sick, and writes the histories that outlast the lords he
              serves.
            </p>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>Emphasis</span>
            <p>
              Words can carry <strong>bold weight</strong> or an{" "}
              <em>italic aside</em>, and a{" "}
              <Link href="/houses/">cross-reference links onward</Link> in brass
              and verdigris.
            </p>
          </div>
          <div className={styles.specimen}>
            <span className={styles.specLabel}>Lede</span>
            <p className="subtitle">
              An italic lede, small and faded, sits beneath the title.
            </p>
          </div>
        </div>

        <h3>Type roles</h3>
        <ul className={styles.fontList}>
          {FONT_ROLES.map((f) => (
            <li key={f.label} className={styles.fontRow}>
              <span className={styles.specLabel}>{f.label}</span>
              <span
                className={styles.fontSample}
                style={{ fontFamily: f.family }}
              >
                {f.sample}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <FiligreeRule className={styles.divider} />

      {/* ---------------------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="ds-spacing">
        <h2 id="ds-spacing">Spacing & rhythm</h2>
        <p className={styles.sectionIntro}>
          One ramp of rem steps drives every gap and pad. Space items with{" "}
          <code className={styles.code}>gap</code> and{" "}
          <code className={styles.code}>padding</code>; margins are avoided.
        </p>

        <ul className={styles.spaceList}>
          {SPACING.map((s) => (
            <li key={s.step} className={styles.spaceRow}>
              <span className={styles.specLabel}>
                {s.step} · {s.rem}
              </span>
              <span className={styles.spaceBar} style={{ width: s.rem }} />
              <span className={styles.spacePx}>{s.px}</span>
            </li>
          ))}
        </ul>

        <div className={styles.spaceDemos}>
          <div className={styles.spaceDemo}>
            <span className={styles.specLabel}>padding: 1.5rem</span>
            <span className={styles.padBox}>
              <span className={styles.padInner} />
            </span>
          </div>
          <div className={styles.spaceDemo}>
            <span className={styles.specLabel}>gap: 1rem</span>
            <span className={styles.gapRow}>
              <span className={styles.gapBox} />
              <span className={styles.gapBox} />
              <span className={styles.gapBox} />
              <span className={styles.gapBox} />
            </span>
          </div>
        </div>
      </section>

      <FiligreeRule className={styles.divider} />

      {/* ---------------------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="ds-controls">
        <h2 id="ds-controls">Form controls</h2>
        <p className={styles.sectionIntro}>
          Every native control, machined in gunmetal and brass and sealed with
          verdigris. Try them: the fields hold their own state, and{" "}
          <em>Reset fields</em> restores the defaults.
        </p>

        <form className={styles.controls}>
          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Text fields</legend>
            <div className={styles.fieldGrid}>
              {TEXT_FIELDS.map((f) => (
                <Field key={f.id} id={f.id} label={f.label} hint={f.hint}>
                  <input
                    id={f.id}
                    className={styles.control}
                    type={f.type}
                    placeholder={f.placeholder}
                    defaultValue={f.defaultValue}
                    autoComplete={f.autoComplete}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                  />
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Date & time</legend>
            <div className={styles.fieldGrid}>
              {DATETIME_FIELDS.map((f) => (
                <Field key={f.id} id={f.id} label={f.label}>
                  <input
                    id={f.id}
                    className={styles.control}
                    type={f.type}
                    defaultValue={f.defaultValue}
                  />
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Range, colour & file</legend>
            <div className={styles.fieldGrid}>
              <Field id="df-range" label="Range" hint="Bannermen mustered">
                <input
                  id="df-range"
                  className={styles.range}
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={65}
                />
              </Field>
              <Field id="df-color" label="Colour">
                <input
                  id="df-color"
                  className={styles.colorInput}
                  type="color"
                  defaultValue="#79a48c"
                />
              </Field>
              <Field id="df-file" label="File" hint="Upload a sigil">
                <input id="df-file" className={styles.file} type="file" />
              </Field>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Long-form text</legend>
            <div className={styles.fieldGrid}>
              <Field id="df-textarea" label="Textarea">
                <textarea
                  id="df-textarea"
                  className={styles.textarea}
                  rows={4}
                  defaultValue="Fire cannot kill a dragon."
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Selection menus</legend>
            <div className={styles.fieldGrid}>
              <Field id="df-select" label="Dropdown">
                <select
                  id="df-select"
                  className={styles.control}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a house…
                  </option>
                  <option value="stark">Stark</option>
                  <option value="lannister">Lannister</option>
                  <option value="targaryen">Targaryen</option>
                  <option value="baratheon">Baratheon</option>
                  <option value="martell">Martell</option>
                </select>
              </Field>

              <Field id="df-select-grouped" label="Grouped dropdown">
                <select
                  id="df-select-grouped"
                  className={styles.control}
                  defaultValue="stark"
                >
                  <optgroup label="The North">
                    <option value="stark">Stark</option>
                    <option value="mormont">Mormont</option>
                    <option value="bolton">Bolton</option>
                  </optgroup>
                  <optgroup label="The Reach">
                    <option value="tyrell">Tyrell</option>
                    <option value="tarly">Tarly</option>
                  </optgroup>
                  <optgroup label="Dorne">
                    <option value="martell">Martell</option>
                    <option value="yronwood">Yronwood</option>
                  </optgroup>
                </select>
              </Field>

              <Field
                id="df-datalist"
                label="Autocomplete"
                hint="Type to filter the roll"
              >
                <input
                  id="df-datalist"
                  className={styles.control}
                  list="df-houses"
                  placeholder="Begin a name…"
                />
                <datalist id="df-houses">
                  <option value="Stark" />
                  <option value="Stokeworth" />
                  <option value="Swann" />
                  <option value="Tarly" />
                  <option value="Tully" />
                  <option value="Tyrell" />
                </datalist>
              </Field>

              <Field
                id="df-multi"
                label="Multi-select"
                hint="Hold ⌘ / Ctrl to pick several"
              >
                <select
                  id="df-multi"
                  className={styles.multi}
                  multiple
                  size={6}
                  defaultValue={["Winterfell", "Highgarden"]}
                >
                  {MULTI_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Choices</legend>
            <div className={styles.fieldGrid}>
              <fieldset className={styles.optionSet}>
                <legend className={styles.optionLegend}>Show on map</legend>
                {CHECKBOXES.map((c) => (
                  <label key={c.id} className={styles.option} htmlFor={c.id}>
                    <input
                      id={c.id}
                      className={styles.check}
                      type="checkbox"
                      name="map-layers"
                      defaultChecked={c.checked}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className={styles.optionSet}>
                <legend className={styles.optionLegend}>Sort houses by</legend>
                {RADIOS.map((r) => (
                  <label key={r.id} className={styles.option} htmlFor={r.id}>
                    <input
                      id={r.id}
                      className={styles.check}
                      type="radio"
                      name="sort-houses"
                      defaultChecked={r.checked}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </fieldset>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Toggle</span>
                <label className={styles.switch}>
                  <input
                    className={styles.switchInput}
                    type="checkbox"
                    defaultChecked
                  />
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                  <span className={styles.switchText}>
                    Reveal extinct houses
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>States</legend>
            <div className={styles.fieldGrid}>
              <Field id="df-disabled" label="Disabled">
                <input
                  id="df-disabled"
                  className={styles.control}
                  type="text"
                  defaultValue="Beyond the Wall"
                  disabled
                />
              </Field>
              <Field id="df-readonly" label="Read only">
                <input
                  id="df-readonly"
                  className={styles.control}
                  type="text"
                  defaultValue="298 AC"
                  readOnly
                />
              </Field>
              <Field
                id="df-invalid"
                label="Invalid"
                hint="This raven never arrived."
              >
                <input
                  id="df-invalid"
                  className={styles.control}
                  type="email"
                  defaultValue="not-a-raven"
                  aria-invalid="true"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLegend}>Buttons</legend>
            <div className={styles.btnRow}>
              <button type="button" className={styles.btnPrimary}>
                Send the raven
              </button>
              <button type="button" className={styles.btn}>
                Save draft
              </button>
              <button type="reset" className={styles.btnGhost}>
                Reset fields
              </button>
              <button type="button" className={styles.btn} disabled>
                Sealed
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </ParchmentLayout>
  );
}
