"use client";

import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** Extra class for the rare list that restyles the field, e.g. houses. */
  className?: string;
};

/** The plain styled filter field every list index shares. */
export function ListSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: Props) {
  return (
    <input
      type="search"
      className={cx(listSearch.input, className)}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      autoComplete="off"
      spellCheck={false}
    />
  );
}
