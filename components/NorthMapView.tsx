'use client';

import { useState } from 'react';
import type { Castle } from '@/lib/schemas';
import { ALL_CASTLE_TYPES, selectVisibleCastles } from '@/lib/map';
import { MapStage } from './MapStage';
import { MapMarker } from './MapMarker';
import { MapLayerToggle } from './MapLayerToggle';

type CastleType = Castle['type'];
type Loaded<T> = { frontmatter: T; body: string; slug: string };

type Props = {
  castles: Array<Loaded<Castle>>;
};

export function NorthMapView({ castles }: Props) {
  const [enabled, setEnabled] = useState<Set<CastleType>>(new Set(ALL_CASTLE_TYPES));

  const toggle = (type: CastleType) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const visible = selectVisibleCastles(castles, enabled);

  return (
    <>
      <MapLayerToggle enabled={enabled} onToggle={toggle} />
      <MapStage svgUrl="/map/westeros.svg">
        {visible.map((c) => (
          <MapMarker
            key={c.frontmatter.slug}
            slug={c.frontmatter.slug}
            name={c.frontmatter.name}
            type={c.frontmatter.type}
            cx={c.frontmatter.coords.x}
            cy={c.frontmatter.coords.y}
          />
        ))}
      </MapStage>
    </>
  );
}
