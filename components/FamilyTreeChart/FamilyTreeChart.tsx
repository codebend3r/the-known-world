"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cx } from "@/lib/cx";
import {
  LAYOUT_CONSTANTS,
  type LaidOutChart,
  type LayoutPerson,
} from "@/lib/family-tree-layout";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;
const LABEL_GAP = 8;
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const WHEEL_SENSITIVITY = 0.0015;
const PINCH_WHEEL_SENSITIVITY = 0.03;
const BUTTON_STEP = 1.25;
const PRESET_SCALES = [0.5, 1, 2, 4, 8] as const;
const INITIAL_SCALE = 2; // the new "100%", the legible default
const SCALE_EPSILON = 0.001;
const ANIM_MS = 200;
const DRAG_THRESHOLD = 3; // px

// Width matches DOT_R * 2 * devicePixelRatio for retina (~56 css px -> request 96 source px).
// Netlify image CDN serves resized/compressed copies of the originals in `/public/characters/*`.
const PORTRAIT_SOURCE_WIDTH = 96;
const PORTRAIT_QUALITY = 75;

function optimizedPortrait(path: string): string {
  if (process.env.NODE_ENV !== "production") return path;
  const params = new URLSearchParams({
    url: path,
    w: String(PORTRAIT_SOURCE_WIDTH),
    q: String(PORTRAIT_QUALITY),
  });
  return `/.netlify/images?${params.toString()}`;
}

const ROMAN_NUMERAL = /^[IVXLCDM]+$/;

function wasKing(titles: ReadonlyArray<string>): boolean {
  return titles.some((t) => t.startsWith("King "));
}

function formatLabel(person: LayoutPerson): string {
  const parts = person.name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const lastInitial = `${last.charAt(0).toUpperCase()}.`;
  if (wasKing(person.titles)) {
    const numeral = parts.slice(1, -1).find((p) => ROMAN_NUMERAL.test(p));
    if (numeral) return `${parts[0]} ${numeral} ${lastInitial}`;
  }
  return `${parts[0]} ${lastInitial}`;
}

function formatTitle(person: LayoutPerson): string {
  return person.alias ? `${person.name} (${person.alias})` : person.name;
}

function dotClassName(p: LayoutPerson): string {
  return cx(
    styles.dot,
    p.placeholder && styles.dotPlaceholder,
    p.external && styles.dotExternal,
  );
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function zoomAtPoint(
  current: Transform,
  newScale: number,
  anchorX: number,
  anchorY: number,
): Transform {
  const px = (anchorX - current.tx) / current.scale;
  const py = (anchorY - current.ty) / current.scale;
  return {
    scale: newScale,
    tx: anchorX - px * newScale,
    ty: anchorY - py * newScale,
  };
}

type ScreenToViewBox = {
  /** Convert screen coordinates to viewBox coordinates. */
  point: (clientX: number, clientY: number) => { x: number; y: number };
  /** Multiply a screen-pixel delta by this to get a viewBox-unit delta. */
  deltaScale: number;
};

function getScreenToViewBox(
  svg: SVGSVGElement | null,
  bounds: { width: number; height: number },
): ScreenToViewBox {
  const rect = svg?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) {
    return {
      point: (clientX, clientY) => ({ x: clientX, y: clientY }),
      deltaScale: 1,
    };
  }
  const renderedScale = Math.min(
    rect.width / bounds.width,
    rect.height / bounds.height,
  );
  const renderedW = bounds.width * renderedScale;
  const renderedH = bounds.height * renderedScale;
  const offsetX = (rect.width - renderedW) / 2;
  const offsetY = (rect.height - renderedH) / 2;
  const deltaScale = 1 / renderedScale;
  return {
    point: (clientX, clientY) => ({
      x: (clientX - rect.left - offsetX) * deltaScale,
      y: (clientY - rect.top - offsetY) * deltaScale,
    }),
    deltaScale,
  };
}

function initialCenteredTransform(bounds: {
  width: number;
  height: number;
}): Transform {
  return zoomAtPoint(
    { scale: 1, tx: 0, ty: 0 },
    INITIAL_SCALE,
    bounds.width / 2,
    bounds.height / 2,
  );
}

function pointerListToArray(map: Map<number, Pointer>): Pointer[] {
  return Array.from(map.values());
}

function distance(a: Pointer, b: Pointer): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Pointer, b: Pointer): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return true;
}

function isLinkable(p: LayoutPerson): boolean {
  return !p.placeholder && p.characterSlug !== null;
}

function childPath(edge: LaidOutChart["childEdges"][number]): string {
  const { from, to, busY } = edge;
  return `M ${from.x} ${from.y} V ${busY} H ${to.x} V ${to.y}`;
}

type Transform = { scale: number; tx: number; ty: number };

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTx: number;
  startTy: number;
  captured: boolean;
};

type Pointer = { x: number; y: number };

type PinchState = {
  startDistance: number;
  startScale: number;
  startTx: number;
  startTy: number;
  anchorViewBoxX: number;
  anchorViewBoxY: number;
};

type Props = {
  chart: LaidOutChart;
};

export function FamilyTreeChart({ chart }: Props) {
  const clipPrefix = useId();
  const [transform, setTransform] = useState<Transform>(() =>
    initialCenteredTransform(chart.bounds),
  );
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, Pointer>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const { bounds } = chart;

  const personMap = useMemo(() => {
    const map = new Map<string, LayoutPerson>();
    chart.persons.forEach((p) => {
      map.set(`${p.slug}-${p.isSpouse ? "s" : "n"}`, p);
    });
    return map;
  }, [chart.persons]);

  const clipPathsMemo = useMemo(
    () =>
      chart.persons
        .filter((p) => p.portrait !== null)
        .map((p) => (
          <clipPath
            id={`${clipPrefix}-clip-${p.slug}`}
            key={`${clipPrefix}-clip-${p.slug}`}
          >
            <circle cx={p.x} cy={p.y} r={DOT_R - 1} />
          </clipPath>
        )),
    [chart.persons, clipPrefix],
  );

  const bodyMemo = useMemo(
    () => (
      <>
        {chart.childEdges.map((edge, i) => (
          <path
            key={`edge-${i}`}
            data-child-edge
            className={styles.edge}
            d={childPath(edge)}
          />
        ))}
        {chart.spouseEdges.map((edge, i) => {
          const personA = personMap.get(`${edge.personSlug}-n`);
          const personB = personMap.get(`${edge.spouseSlug}-s`);
          if (!personA || !personB) return null;
          const midX = (personA.x + personB.x) / 2;
          return (
            <text
              key={`cross-${i}`}
              data-cross
              className={styles.cross}
              x={midX}
              y={personA.y + 3}
            >
              ⚭
            </text>
          );
        })}
        {chart.persons.map((p) => {
          const dotEl = (
            <>
              <circle
                data-person
                cx={p.x}
                cy={p.y}
                r={DOT_R}
                className={dotClassName(p)}
              />
              {p.portrait !== null && (
                <image
                  href={optimizedPortrait(p.portrait)}
                  x={p.x - DOT_R}
                  y={p.y - DOT_R}
                  width={DOT_R * 2}
                  height={DOT_R * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipPrefix}-clip-${p.slug})`}
                />
              )}
            </>
          );
          const label = (
            <text className={styles.label} x={p.x} y={p.y - DOT_R - LABEL_GAP}>
              {formatLabel(p)}
            </text>
          );
          const title = <title>{formatTitle(p)}</title>;
          const key = `${p.slug}-${p.isSpouse ? "s" : "n"}`;
          if (isLinkable(p)) {
            return (
              <a key={key} href={`/characters/${p.characterSlug}/`}>
                {title}
                {dotEl}
                {label}
              </a>
            );
          }
          return (
            <g key={key}>
              {title}
              {dotEl}
              {label}
            </g>
          );
        })}
      </>
    ),
    [chart, clipPrefix, personMap],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { point } = getScreenToViewBox(svg, bounds);
      const { x: viewBoxX, y: viewBoxY } = point(e.clientX, e.clientY);
      const sensitivity = e.ctrlKey
        ? PINCH_WHEEL_SENSITIVITY
        : WHEEL_SENSITIVITY;
      setTransform((t) => {
        const factor = 1 - e.deltaY * sensitivity;
        const next = clampScale(t.scale * factor);
        if (next === t.scale) return t;
        return zoomAtPoint(t, next, viewBoxX, viewBoxY);
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [bounds]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  if (chart.persons.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          No members of this house have yet been recorded.
        </p>
      </div>
    );
  }

  const animateTo = (target: Transform) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (prefersReducedMotion || typeof window === "undefined") {
      setTransform(target);
      return;
    }
    const from = transform;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / ANIM_MS);
      const e = easeOutCubic(t);
      setTransform({
        scale: from.scale + (target.scale - from.scale) * e,
        tx: from.tx + (target.tx - from.tx) * e,
        ty: from.ty + (target.ty - from.ty) * e,
      });
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  };

  const boxCenter = () => ({
    x: bounds.width / 2,
    y: bounds.height / 2,
  });

  const zoomBy = (factor: number) => {
    const c = boxCenter();
    const next = clampScale(transform.scale * factor);
    animateTo(zoomAtPoint(transform, next, c.x, c.y));
  };

  const zoomTo = (scale: number) => {
    const c = boxCenter();
    animateTo(zoomAtPoint(transform, clampScale(scale), c.x, c.y));
  };

  const reset = () => {
    animateTo(initialCenteredTransform(bounds));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTx: transform.tx,
        startTy: transform.ty,
        captured: false,
      };
      // No pointer capture and no isDragging yet, wait for movement past
      // DRAG_THRESHOLD so taps still reach the underlying <a> as plain clicks.
    } else if (pointersRef.current.size === 2 && svgRef.current) {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      const [a, b] = pointerListToArray(pointersRef.current);
      const m = midpoint(a, b);
      const { point } = getScreenToViewBox(svgRef.current, bounds);
      const anchor = point(m.x, m.y);
      pinchRef.current = {
        startDistance: distance(a, b),
        startScale: transform.scale,
        startTx: transform.tx,
        startTy: transform.ty,
        anchorViewBoxX: anchor.x,
        anchorViewBoxY: anchor.y,
      };
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const stored = pointersRef.current.get(e.pointerId);
    if (!stored) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size === 2) {
      const [a, b] = pointerListToArray(pointersRef.current);
      const ratio = distance(a, b) / pinch.startDistance;
      const nextScale = clampScale(pinch.startScale * ratio);
      setTransform(() =>
        zoomAtPoint(
          {
            scale: pinch.startScale,
            tx: pinch.startTx,
            ty: pinch.startTy,
          },
          nextScale,
          pinch.anchorViewBoxX,
          pinch.anchorViewBoxY,
        ),
      );
      return;
    }

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.captured) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      d.captured = true;
      setIsDragging(true);
    }
    const { deltaScale } = getScreenToViewBox(svgRef.current, bounds);
    setTransform((t) => ({
      ...t,
      tx: d.startTx + dx * deltaScale,
      ty: d.startTy + dy * deltaScale,
    }));
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 1) {
      const [remaining] = pointerListToArray(pointersRef.current);
      dragRef.current = {
        pointerId: Array.from(pointersRef.current.keys())[0],
        startClientX: remaining.x,
        startClientY: remaining.y,
        startTx: transform.tx,
        startTy: transform.ty,
        captured: true,
      };
      setIsDragging(true);
      return;
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      className={cx(
        styles.container,
        isFullscreen && styles.containerFullscreen,
      )}
      data-fullscreen={isFullscreen || undefined}
    >
      <svg
        ref={svgRef}
        className={cx(styles.svg, isDragging && styles.dragging)}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Family tree chart"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>{clipPathsMemo}</defs>
        <g
          data-pan-root
          transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
        >
          {bodyMemo}
        </g>
      </svg>
      <div className={styles.controls} role="group" aria-label="Chart controls">
        <div className={styles.controlRow}>
          <button
            type="button"
            className={styles.controlButton}
            aria-label="Zoom in"
            onClick={() => zoomBy(BUTTON_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className={styles.controlButton}
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / BUTTON_STEP)}
          >
            −
          </button>
        </div>
        <div className={styles.controlRow}>
          {PRESET_SCALES.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.controlButton}
              aria-label={`Zoom to ${Math.round(preset * 50)}%`}
              aria-pressed={Math.abs(transform.scale - preset) < SCALE_EPSILON}
              onClick={() => zoomTo(preset)}
            >
              {Math.round(preset * 50)}%
            </button>
          ))}
        </div>
        <button
          type="button"
          className={cx(styles.controlButton, styles.controlReset)}
          aria-label="Reset zoom"
          onClick={reset}
        >
          ⟲ Reset
        </button>
        <button
          type="button"
          className={cx(styles.controlButton, styles.controlReset)}
          aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
          onClick={() => setIsFullscreen((v) => !v)}
        >
          {isFullscreen ? "⛶ Exit fullscreen" : "⛶ Fullscreen"}
        </button>
      </div>
    </div>
  );
}
