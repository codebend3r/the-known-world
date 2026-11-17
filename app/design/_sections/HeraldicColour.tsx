import { DesignSection } from "@/app/design/_sections/DesignSection";
import { shieldVars } from "@/app/design/_sections/shield-vars";
import shared from "@/app/design/_sections/DesignSection.module.scss";
import styles from "@/app/design/_sections/HeraldicColour.module.scss";

type Heraldry = {
  name: string;
  initial: string;
  token: `--house-${string}`;
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

export function HeraldicColour() {
  return (
    <DesignSection
      heading="02 · Heraldic colour"
      lede={
        <>
          House and region colour is <em>data</em>, not decoration. It
          identifies; it never themes the page. Use it on banners, shields,
          swatches, and pins only.
        </>
      }
    >
      <ul className={styles.heraldryGrid}>
        {HOUSE_PALETTE.map((house) => (
          <li key={house.token} className={styles.heraldry}>
            <span
              className={styles.shield}
              style={shieldVars({ token: house.token })}
              aria-hidden="true"
            >
              {house.initial}
            </span>
            <span className={styles.heraldryName}>{house.name}</span>
            <code className={shared.swatchToken}>{house.token}</code>
          </li>
        ))}
      </ul>
    </DesignSection>
  );
}
