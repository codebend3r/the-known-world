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
        sizes={sizes ?? size ?? "6rem"}
        priority={priority}
      />
    </span>
  );
}
