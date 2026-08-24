import type { CSSProperties } from "react";
import Image from "next/image";
import { cx } from "@/lib/cx";
import { sigilFile } from "@/lib/sigil";
import styles from "@/components/Sigil/Sigil.module.scss";

type Props = {
  slug: string | null;
  name: string;
  region?: string | null;
  size?: string;
  sizes?: string;
  decorative?: boolean;
  hasPlate?: boolean;
  className?: string;
  priority?: boolean;
};

export function Sigil({
  slug,
  name,
  region,
  size,
  sizes,
  decorative = false,
  hasPlate = true,
  className,
  priority = false,
}: Props) {
  if (slug === null) return null;

  // The shield plate behind the artwork takes the region's heraldic tint as its
  // metal. An unknown region leaves `--sigil-metal` guaranteed-invalid, so the
  // module's gold fallback applies.
  const style: CSSProperties = {
    ...(size ? { "--sigil-size": size } : {}),
    ...(region ? { "--sigil-metal": `var(--region-color-${region})` } : {}),
  };

  return (
    <span
      className={cx(styles.sigil, !hasPlate && styles.plateless, className)}
      style={style}
      aria-hidden={decorative || undefined}
    >
      <Image
        src={`/sigils/${sigilFile({ slug, region })}.png`}
        alt={decorative ? "" : `Sigil of House ${name}`}
        fill
        sizes={sizes ?? size ?? "6rem"}
        priority={priority}
      />
    </span>
  );
}
