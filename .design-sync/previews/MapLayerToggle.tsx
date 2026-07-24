import { useState } from "react";
import { MapLayerToggle } from "game-of-thrones-atlas";

// MapLayerToggle renders a checkbox per castle type (castle, town, ruin,
// watchtower, holdfast). It is controlled via an `enabled` Set plus an
// `onToggle(type)` callback; local Set state makes the checkboxes live.
export const Default = () => {
  const [enabled, setEnabled] = useState(new Set(["castle", "town"]));
  const onToggle = (type) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  return <MapLayerToggle enabled={enabled} onToggle={onToggle} />;
};
