"use client";

import { MAP_LAYERS, type MapLayer } from "@/lib/map";
import styles from "@/components/MapLayerToggle/MapLayerToggle.module.scss";

type Props = {
  enabled: Set<MapLayer>;
  onToggle: (layer: MapLayer) => void;
};

export function MapLayerToggle({ enabled, onToggle }: Props) {
  return (
    <div className={styles.toggle} role="group" aria-label="Map layers">
      {MAP_LAYERS.map((layer) => (
        <label key={layer}>
          <input
            type="checkbox"
            checked={enabled.has(layer)}
            onChange={() => onToggle(layer)}
          />
          {layer}
        </label>
      ))}
    </div>
  );
}
