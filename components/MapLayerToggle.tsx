"use client";

import type { Castle } from "@/lib/schemas";
import { ALL_CASTLE_TYPES } from "@/lib/map";
import styles from "@/components/MapLayerToggle.module.css";

type CastleType = Castle["type"];

type Props = {
  enabled: Set<CastleType>;
  onToggle: (type: CastleType) => void;
};

export function MapLayerToggle({ enabled, onToggle }: Props) {
  return (
    <div className={styles.toggle} role="group" aria-label="Map layers">
      {ALL_CASTLE_TYPES.map((type) => (
        <label key={type}>
          <input
            type="checkbox"
            checked={enabled.has(type)}
            onChange={() => onToggle(type)}
          />
          {type}
        </label>
      ))}
    </div>
  );
}
