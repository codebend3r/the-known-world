'use client';

import type { Castle } from '@/lib/schemas';
import { ALL_CASTLE_TYPES } from '@/lib/map';

type CastleType = Castle['type'];

type Props = {
  enabled: Set<CastleType>;
  onToggle: (type: CastleType) => void;
};

export function MapLayerToggle({ enabled, onToggle }: Props) {
  return (
    <div className="map-layer-toggle" role="group" aria-label="Map layers">
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
