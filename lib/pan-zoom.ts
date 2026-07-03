export type Transform = { scale: number; tx: number; ty: number };

export type Pointer = { x: number; y: number };

export function zoomAtPoint({
  current,
  scale,
  anchorX,
  anchorY,
}: {
  current: Transform;
  scale: number;
  anchorX: number;
  anchorY: number;
}): Transform {
  const px = (anchorX - current.tx) / current.scale;
  const py = (anchorY - current.ty) / current.scale;
  return {
    scale,
    tx: anchorX - px * scale,
    ty: anchorY - py * scale,
  };
}

export function initialCenteredTransform({
  bounds,
  scale,
}: {
  bounds: { width: number; height: number };
  scale: number;
}): Transform {
  return zoomAtPoint({
    current: { scale: 1, tx: 0, ty: 0 },
    scale,
    anchorX: bounds.width / 2,
    anchorY: bounds.height / 2,
  });
}

export function distance(a: Pointer, b: Pointer): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Pointer, b: Pointer): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
