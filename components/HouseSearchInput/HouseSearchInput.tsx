"use client";

import { EntitySearchInput } from "@/components/EntitySearchInput";

type Props = {
  placeholder?: string;
  ariaLabel?: string;
};

// The house plate's jump-to-house field. Houses carry no `aliases`, so the
// muted parenthetical on an option is the region instead — the same datum the
// register card hangs beside a house name.
export function HouseSearchInput({ placeholder, ariaLabel }: Props) {
  return (
    <EntitySearchInput
      collection="houses"
      placeholder={placeholder}
      ariaLabel={ariaLabel}
    />
  );
}
