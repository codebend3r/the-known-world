import type { CSSProperties } from "react";
import Image from "next/image";
import { cx } from "@/lib/cx";
import styles from "@/components/Sigil.module.scss";

export const SIGIL_SLUGS = new Set([
  "stark",
  "lannister",
  "targaryen",
  "baratheon",
  "greyjoy",
  "tully",
  "arryn",
  "martell",
  "tyrell",
  "bolton",
  "frey",
  "mormont",
  "umber",
  "karstark",
  "reed",
  "hightower",
  "velaryon",
  "tarly",
  "blackwood",
  "bracken",
  "dayne",
  "yronwood",
  "royce",
  "corbray",
  "redwyne",
  "florent",
  "rowan",
  "oakheart",
  "mallister",
  "piper",
  "manderly",
  "dustin",
  "ryswell",
  "hornwood",
  "cerwyn",
  "blackfyre",
  "bar-emmon",
  "celtigar",
  "chester",
  "crakehall",
  "glover",
  "peake",
  "reyne",
  "selmy",
  "wyl",
  "swann",
  "dondarrion",
  "caron",
  "estermont",
  "grafton",
  "tarth",
  "durrandon",
  "webber",
  "osgrey",
  "qorgyle",
  "allyrion",
  "banefort",
  "beesbury",
  "connington",
  "hoare",
  "marbrand",
  "stokeworth",
  "whent",
  "strong",
  "ashford",
  "hardyng",
  "freefolk",
  "fossoway-cider-hall",
  "fossoway-new-barrel",
  "duncan-the-tall",
  "clegane",
  "payne",
  "tarbeck",
  "dalt",
  "harroway",
  "lothston",
  "mooton",
  "poole",
  "fisher",
  "gardener",
  "greyiron",
  "hollard",
  "mudd",
  "qoherys",
  "unknown",
]);

const REGION_FILE: Record<string, string> = {
  north: "the-north",
  vale: "the-vale",
  riverlands: "the-riverlands",
  westerlands: "westerlands",
  reach: "the-reach",
  stormlands: "stormlands",
  dorne: "dorne",
  "iron-islands": "iron-islands",
  crownlands: "crownlands",
};

const SLUG_ALIASES: Record<string, string> = {
  durrandon: "baratheon",
};

function sigilFile({
  slug,
  region,
}: {
  slug: string;
  region?: string | null;
}): string {
  if (SIGIL_SLUGS.has(slug)) return SLUG_ALIASES[slug] ?? slug;
  if (region && REGION_FILE[region]) return REGION_FILE[region];
  return "unknown";
}

type Props = {
  slug: string | null;
  name: string;
  region?: string | null;
  size?: string;
  decorative?: boolean;
  className?: string;
  priority?: boolean;
};

export function Sigil({
  slug,
  name,
  region,
  size,
  decorative = false,
  className,
  priority = false,
}: Props) {
  if (slug === null) return null;

  const style = size ? ({ "--sigil-size": size } as CSSProperties) : undefined;

  return (
    <span
      className={cx(styles.sigil, className)}
      style={style}
      aria-hidden={decorative || undefined}
    >
      <Image
        src={`/sigils/${sigilFile({ slug, region })}.png`}
        alt={decorative ? "" : `Sigil of House ${name}`}
        fill
        sizes={size ?? "6rem"}
        priority={priority}
      />
    </span>
  );
}
