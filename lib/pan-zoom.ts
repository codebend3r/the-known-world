export type Transform = { scale: number; tx: number; ty: number };

export type Pointer = { x: number; y: number };

// Signs are content deltas: panning the view up shifts the drawing down.
export const PAN_DIRECTIONS = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
} as const satisfies Record<string, Pointer>;

export type PanDirection = keyof typeof PAN_DIRECTIONS;

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

export function distance({ a, b }: { a: Pointer; b: Pointer }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint({ a, b }: { a: Pointer; b: Pointer }): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Share of the viewport one arrow-key or d-pad press pans by. */
export const PAN_STEP_RATIO = 0.2;

// Advertised on each pan/zoom canvas so assistive tech can list the shortcuts
// rather than leaving a visible hint line as the only place they exist.
export const CANVAS_KEY_SHORTCUTS =
  "ArrowUp ArrowDown ArrowLeft ArrowRight + - 0";

/** One pan step, in content units at the current `scale`. */
export function panStep({
  direction,
  width,
  height,
  scale,
}: {
  direction: PanDirection;
  width: number;
  height: number;
  scale: number;
}): Pointer {
  const { x, y } = PAN_DIRECTIONS[direction];
  return {
    x: (x * width * PAN_STEP_RATIO) / scale,
    y: (y * height * PAN_STEP_RATIO) / scale,
  };
}

export type CanvasKeyHandlers = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  pan: (direction: PanDirection) => void;
};

// `=` shares the `+` key on most layouts, so an unshifted press still zooms in.
const CANVAS_KEY_ACTIONS = {
  "+": (handlers) => handlers.zoomIn(),
  "=": (handlers) => handlers.zoomIn(),
  "-": (handlers) => handlers.zoomOut(),
  "0": (handlers) => handlers.reset(),
  ArrowUp: (handlers) => handlers.pan("up"),
  ArrowDown: (handlers) => handlers.pan("down"),
  ArrowLeft: (handlers) => handlers.pan("left"),
  ArrowRight: (handlers) => handlers.pan("right"),
} as const satisfies Record<string, (handlers: CanvasKeyHandlers) => void>;

function isCanvasKey(key: string): key is keyof typeof CANVAS_KEY_ACTIONS {
  return Object.hasOwn(CANVAS_KEY_ACTIONS, key);
}

/**
 * The canvas action a key press maps to, ready to run, or `null` when the key
 * is not a canvas shortcut (so the caller leaves the event alone).
 */
export function canvasKeyAction({
  key,
  handlers,
}: {
  key: string;
  handlers: CanvasKeyHandlers;
}): (() => void) | null {
  if (!isCanvasKey(key)) return null;
  const run = CANVAS_KEY_ACTIONS[key];
  return () => run(handlers);
}
