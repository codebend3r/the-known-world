"use client";

import { useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import type { PortraitVariant } from "@/lib/portrait-variants";
import { useSpoilers } from "@/lib/spoilers";
import styles from "@/components/PortraitVariants/PortraitVariants.module.scss";

type Props = {
  variants: PortraitVariant[];
  name: string;
};

function altFor({
  variant,
  name,
}: {
  variant: PortraitVariant;
  name: string;
}): string {
  return variant.isPrimary
    ? `Portrait of ${name}`
    : `Portrait of ${name} — ${variant.label}`;
}

export function PortraitVariants({ variants, name }: Props) {
  const { isShowingSpoilers } = useSpoilers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const primary = variants[0];
  if (!primary) return null;

  // With spoilers off the later lives are not merely unselected, they are not
  // rendered at all — a variant's label ("Kingsguard") is itself the spoiler.
  // The site is statically exported, so the whole list still ships in the RSC
  // payload and is readable from view-source: this hides spoilers from a
  // reader, it does not keep them from someone digging for them.
  const visible = isShowingSpoilers ? variants : [primary];
  const active =
    visible.find((variant) => variant.id === selectedId) ?? primary;
  const hasTabs = visible.length > 1;

  const tabId = (id: string) => `${baseId}-${id}`;
  const panelId = `${baseId}-panel`;

  const select = ({
    id,
    shouldFocus,
  }: {
    id: string;
    shouldFocus: boolean;
  }) => {
    setSelectedId(id);
    if (!shouldFocus) return;
    tabsRef.current
      ?.querySelector<HTMLButtonElement>(`[data-variant="${id}"]`)
      ?.focus();
  };

  const step = (delta: number) => {
    const index = visible.findIndex((variant) => variant.id === active.id);
    const next = visible[(index + delta + visible.length) % visible.length];
    if (next) select({ id: next.id, shouldFocus: true });
  };

  const jump = (edge: "first" | "last") => {
    const next = edge === "first" ? visible[0] : visible[visible.length - 1];
    if (next) select({ id: next.id, shouldFocus: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const handled = true;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        step(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        step(-1);
        break;
      case "Home":
        jump("first");
        break;
      case "End":
        jump("last");
        break;
      default:
        return;
    }
    if (handled) event.preventDefault();
  };

  return (
    <div className={styles.plate}>
      <div
        className={styles.panel}
        id={hasTabs ? panelId : undefined}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={hasTabs ? tabId(active.id) : undefined}
      >
        {/* Keyed so switching variants mounts a fresh `<video>` rather than
            swapping the `src` of a clip that may be mid-play. */}
        <CharacterPortrait
          key={active.id}
          image={active.image}
          video={active.video}
          alt={altFor({ variant: active, name })}
        />
      </div>

      {hasTabs && (
        <div
          ref={tabsRef}
          role="tablist"
          aria-label={`Portraits of ${name}`}
          className={styles.tabs}
        >
          {visible.map((variant) => {
            const isSelected = variant.id === active.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="tab"
                id={tabId(variant.id)}
                data-variant={variant.id}
                aria-selected={isSelected}
                aria-controls={panelId}
                tabIndex={isSelected ? 0 : -1}
                className={cx(styles.tab, isSelected && styles.tabSelected)}
                onClick={() => select({ id: variant.id, shouldFocus: false })}
                onKeyDown={handleKeyDown}
              >
                {variant.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
