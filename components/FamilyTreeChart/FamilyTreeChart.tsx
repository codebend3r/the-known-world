"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import {
  LAYOUT_CONSTANTS,
  childPath,
  type LaidOutChart,
} from "@/lib/family-tree-layout";
import { clamp } from "@/lib/math";
import { useIsMobile } from "@/lib/useIsMobile";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import {
  CANVAS_KEY_SHORTCUTS,
  canvasKeyAction,
  zoomAtPoint,
  initialCenteredTransform,
  distance,
  midpoint,
  easeOutCubic,
  panStep,
  type PanDirection,
  type Transform,
  type Pointer,
} from "@/lib/pan-zoom";
import {
  PersonNode,
  portraitClipId,
} from "@/components/FamilyTreeChart/PersonNode";
import styles from "@/components/FamilyTreeChart/FamilyTreeChart.module.scss";

const { DOT_R } = LAYOUT_CONSTANTS;
const MIN_SCALE = 0.5;
const MAX_SCALE = 16;
const WHEEL_SENSITIVITY = 0.0015;
const PINCH_WHEEL_SENSITIVITY = 0.03;
const BUTTON_STEP = 1.25;
const PRESET_SCALES = [0.5, 1, 2, 4, 8, 16] as const;
const INITIAL_SCALE = 2; // the new "100%", the legible default
const MOBILE_INITIAL_SCALE = 4; // viewBox shrinks to fit narrow viewports, so start at "200%"
const SCALE_EPSILON = 0.001;
const ANIM_MS = 200;
const DRAG_THRESHOLD = 3; // px

function clampScale(scale: number): number {
  return clamp({ value: scale, min: MIN_SCALE, max: MAX_SCALE });
}

type ScreenToViewBox = {
  point: (client: { clientX: number; clientY: number }) => {
    x: number;
    y: number;
  };
  /** Multiply a screen-pixel delta by this to get a viewBox-unit delta. */
  deltaScale: number;
};

function getScreenToViewBox({
  svg,
  bounds,
}: {
  svg: SVGSVGElement | null;
  bounds: { width: number; height: number };
}): ScreenToViewBox {
  const rect = svg?.getBoundingClientRect() ?? null;
  if (!rect || !rect.width || !rect.height) {
    return {
      point: ({ clientX, clientY }) => ({ x: clientX, y: clientY }),
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
    point: ({ clientX, clientY }) => ({
      x: (clientX - rect.left - offsetX) * deltaScale,
      y: (clientY - rect.top - offsetY) * deltaScale,
    }),
    deltaScale,
  };
}

function pointerListToArray(map: Map<number, Pointer>): Pointer[] {
  return Array.from(map.values());
}

// Not every engine implements pointer capture; the drag still works without it.
function capturePointer({
  element,
  pointerId,
}: {
  element: Element;
  pointerId: number;
}): void {
  if (typeof element.setPointerCapture !== "function") return;
  element.setPointerCapture(pointerId);
}

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTx: number;
  startTy: number;
  isCaptured: boolean;
};

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
    initialCenteredTransform({ bounds: chart.bounds, scale: INITIAL_SCALE }),
  );
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, Pointer>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const didApplyMobileInitialRef = useRef(false);

  const { bounds } = chart;

  const clipPathsMemo = useMemo(
    () =>
      chart.persons
        .filter((p) => p.portrait !== null)
        .map((p) => (
          <clipPath
            id={portraitClipId({ clipPrefix, slug: p.slug })}
            key={portraitClipId({ clipPrefix, slug: p.slug })}
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
        {chart.spouseEdges.map((edge, i) => (
          <text
            key={`cross-${i}`}
            data-cross
            className={styles.cross}
            x={edge.midX}
            y={edge.midY + 3}
          >
            ⚭
          </text>
        ))}
        {chart.persons.map((p) => (
          <PersonNode
            key={`${p.slug}-${p.isSpouse ? "s" : "n"}`}
            person={p}
            clipPrefix={clipPrefix}
          />
        ))}
      </>
    ),
    [chart, clipPrefix],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { point } = getScreenToViewBox({ svg, bounds });
      const { x: viewBoxX, y: viewBoxY } = point({
        clientX: e.clientX,
        clientY: e.clientY,
      });
      const sensitivity = e.ctrlKey
        ? PINCH_WHEEL_SENSITIVITY
        : WHEEL_SENSITIVITY;
      setTransform((t) => {
        const factor = 1 - e.deltaY * sensitivity;
        const next = clampScale(t.scale * factor);
        if (next === t.scale) return t;
        return zoomAtPoint({
          current: t,
          scale: next,
          anchorX: viewBoxX,
          anchorY: viewBoxY,
        });
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

  // One-shot post-mount bump: `useIsMobile` returns false during SSR/hydration
  // (so `useState` starts at `INITIAL_SCALE` to match server HTML), then on
  // mount we snap to the mobile scale if the live matchMedia says we're on a
  // small viewport. Deriving this in `useState` would cause a hydration
  // mismatch on the `<g>` transform attribute.
  useEffect(() => {
    if (didApplyMobileInitialRef.current) return;
    if (!isMobile) return;
    didApplyMobileInitialRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransform(
      initialCenteredTransform({
        bounds: chart.bounds,
        scale: MOBILE_INITIAL_SCALE,
      }),
    );
  }, [isMobile, chart.bounds]);

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

  const zoomTo = (scale: number) => {
    const c = boxCenter();
    animateTo(
      zoomAtPoint({
        current: transform,
        scale: clampScale(scale),
        anchorX: c.x,
        anchorY: c.y,
      }),
    );
  };

  const zoomBy = (factor: number) => zoomTo(transform.scale * factor);

  const reset = () => {
    const scale = isMobile ? MOBILE_INITIAL_SCALE : INITIAL_SCALE;
    animateTo(initialCenteredTransform({ bounds, scale }));
  };

  const panView = (direction: PanDirection) => {
    setTransform((t) => {
      const { x, y } = panStep({
        direction,
        width: bounds.width,
        height: bounds.height,
        scale: t.scale,
      });
      return { ...t, tx: t.tx + x, ty: t.ty + y };
    });
  };

  // The canvas is a `role="application"` surface, so it must answer the same
  // keys the pointer answers: without this the chart is a drag-only widget and
  // every character link inside it is only reachable by Tab through an
  // off-screen node.
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const action = canvasKeyAction({
      key: e.key,
      handlers: {
        zoomIn: () => zoomBy(BUTTON_STEP),
        zoomOut: () => zoomBy(1 / BUTTON_STEP),
        reset,
        pan: panView,
      },
    });
    if (!action) return;
    e.preventDefault();
    action();
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
        isCaptured: false,
      };
      // No pointer capture and no isDragging yet, wait for movement past
      // DRAG_THRESHOLD so taps still reach the underlying <a> as plain clicks.
    } else if (pointersRef.current.size === 2 && svgRef.current) {
      capturePointer({ element: e.currentTarget, pointerId: e.pointerId });
      const [a, b] = pointerListToArray(pointersRef.current);
      const m = midpoint({ a, b });
      const { point } = getScreenToViewBox({ svg: svgRef.current, bounds });
      const anchor = point({ clientX: m.x, clientY: m.y });
      pinchRef.current = {
        startDistance: distance({ a, b }),
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
      const ratio = distance({ a, b }) / pinch.startDistance;
      const nextScale = clampScale(pinch.startScale * ratio);
      setTransform(() =>
        zoomAtPoint({
          current: {
            scale: pinch.startScale,
            tx: pinch.startTx,
            ty: pinch.startTy,
          },
          scale: nextScale,
          anchorX: pinch.anchorViewBoxX,
          anchorY: pinch.anchorViewBoxY,
        }),
      );
      return;
    }

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.isCaptured) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      capturePointer({ element: e.currentTarget, pointerId: e.pointerId });
      d.isCaptured = true;
      setIsDragging(true);
    }
    const { deltaScale } = getScreenToViewBox({ svg: svgRef.current, bounds });
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
        isCaptured: true,
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
        // Not `role="img"`: that prunes the subtree, and every person in this
        // chart is an `<a>` to their character page. `application` keeps the
        // links exposed and hands the arrow keys to `onKeyDown` instead of
        // letting the screen reader eat them.
        role="application"
        aria-label="Family tree chart"
        aria-keyshortcuts={CANVAS_KEY_SHORTCUTS}
        tabIndex={0}
        onKeyDown={onKeyDown}
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
