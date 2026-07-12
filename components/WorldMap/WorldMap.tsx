"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { parseAsBoolean, useQueryState } from "nuqs";
import {
  TOOL_AUTO,
  UncontrolledReactSVGPanZoom,
  type Value,
} from "react-svg-pan-zoom";
import { cx } from "@/lib/cx";
import styles from "@/components/WorldMap/WorldMap.module.scss";

const ZOOM_STEP = 1.5;
const PAN_STEP_RATIO = 0.2;
const INITIAL_VIEW = { zoom: 5, x: -1495, y: -1940 };
// Natural-pixel position of the King's Landing capital icon printed on the
// map, and the radius of the (invisible) click target around it — kept
// tight since neighboring towns (Hayford, Rosby) sit only ~65-100 natural
// pixels away.
const KINGS_LANDING = { x: 1955, y: 4619, radius: 25 };

type PanDirection = "up" | "down" | "left" | "right";

// Signs are SVG-content deltas: panning the view up shifts the drawing down.
const PAN_DIRECTIONS: Record<PanDirection, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

type Props = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
};

export function WorldMap({ src, naturalWidth, naturalHeight }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<UncontrolledReactSVGPanZoom | null>(null);
  const hasSeededViewRef = useRef(false);
  const geometryRef = useRef<{
    size: { w: number; h: number };
    fitScale: number;
  } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [editMode] = useQueryState(
    "editMode",
    parseAsBoolean.withDefault(false),
  );
  const [debugValue, setDebugValue] = useState(INITIAL_VIEW);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const update = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // `ResizeObserver` doesn't reliably re-fire across a fullscreen
    // transition, so re-measure directly once it completes — `fullscreenchange`
    // fires after the element has settled at its final size.
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === el);
      update();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      ro.disconnect();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // The SVG viewbox matches the viewer and the map image is drawn centered
  // at fitted size within it, so the library's default view (identity
  // matrix) shows the whole map: scale 1 = fit.
  const fitScale = !!size
    ? Math.min(size.w / naturalWidth, size.h / naturalHeight)
    : 0;
  const drawnWidth = naturalWidth * fitScale;
  const drawnHeight = naturalHeight * fitScale;

  // Opens on a specific region instead of the fit-to-viewer default on first
  // paint. On every later resize (e.g. entering/exiting fullscreen), the
  // underlying <image> re-centers itself for the new viewer size, but the
  // pan/zoom transform doesn't — so without compensating it here, the
  // visible region would jump. Instead we recompute the transform so the
  // same map point stays centered at the same effective zoom level.
  // `Viewer.setValue()` is the inner viewer's real setter; the outer
  // `UncontrolledReactSVGPanZoom` internally wires its own `onChangeValue`
  // to it, so this still lands in the wrapper's state.
  useEffect(() => {
    if (!size) return;
    const inner = viewerRef.current?.Viewer;
    if (!inner) return;

    if (!hasSeededViewRef.current) {
      hasSeededViewRef.current = true;
      inner.setValue({
        ...inner.getValue(),
        viewerWidth: size.w,
        viewerHeight: size.h,
        a: INITIAL_VIEW.zoom,
        d: INITIAL_VIEW.zoom,
        e: INITIAL_VIEW.x,
        f: INITIAL_VIEW.y,
      });
      geometryRef.current = { size, fitScale };
      return;
    }

    const prev = geometryRef.current;
    if (!prev || (prev.size.w === size.w && prev.size.h === size.h)) {
      geometryRef.current = { size, fitScale };
      return;
    }

    // `inner.getValue()` can still report the pre-resize `viewerWidth`/
    // `viewerHeight` here — the library syncs those itself off the same
    // width/height prop change, via a separate cascading update that isn't
    // guaranteed to have landed before this effect runs. `size` is already
    // authoritative, so it's used directly below instead of trusting the
    // spread for those two fields.
    const current = inner.getValue();
    const prevOffsetX = (prev.size.w - naturalWidth * prev.fitScale) / 2;
    const prevOffsetY = (prev.size.h - naturalHeight * prev.fitScale) / 2;
    const centeredSVGX = (prev.size.w / 2 - current.e) / current.a;
    const centeredSVGY = (prev.size.h / 2 - current.f) / current.a;
    const centeredNaturalX = (centeredSVGX - prevOffsetX) / prev.fitScale;
    const centeredNaturalY = (centeredSVGY - prevOffsetY) / prev.fitScale;

    const nextZoom = current.a * (prev.fitScale / fitScale);
    const nextSVGX = (size.w - drawnWidth) / 2 + centeredNaturalX * fitScale;
    const nextSVGY = (size.h - drawnHeight) / 2 + centeredNaturalY * fitScale;

    const value: Value = {
      ...current,
      viewerWidth: size.w,
      viewerHeight: size.h,
      a: nextZoom,
      d: nextZoom,
      e: size.w / 2 - nextZoom * nextSVGX,
      f: size.h / 2 - nextZoom * nextSVGY,
    };
    inner.setValue(value);
    geometryRef.current = { size, fitScale };
  }, [size, naturalWidth, naturalHeight, fitScale, drawnWidth, drawnHeight]);

  // `UncontrolledReactSVGPanZoom` swallows a consumer `onChangeValue` prop
  // (it destructures it away in favor of its own internal handler), so the
  // live value can only be read by polling `Viewer.getValue()`.
  useEffect(() => {
    if (!editMode) return;
    let frame: number;
    const tick = () => {
      const value = viewerRef.current?.Viewer?.getValue();
      if (value) {
        setDebugValue((prev) =>
          prev.zoom === value.a && prev.x === value.e && prev.y === value.f
            ? prev
            : { zoom: value.a, x: value.e, y: value.f },
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [editMode]);

  const zoomIn = () => viewerRef.current?.zoomOnViewerCenter(ZOOM_STEP);
  const zoomOut = () => viewerRef.current?.zoomOnViewerCenter(1 / ZOOM_STEP);
  const fitView = () => viewerRef.current?.fitToViewer();

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen();
    }
  };

  const panView = (direction: PanDirection) => {
    const viewer = viewerRef.current;
    const inner = viewer?.Viewer ?? null;
    if (!viewer || !inner) return;
    const { a, viewerWidth, viewerHeight } = inner.getValue();
    const { x, y } = PAN_DIRECTIONS[direction];
    viewer.pan(
      (x * viewerWidth * PAN_STEP_RATIO) / a,
      (y * viewerHeight * PAN_STEP_RATIO) / a,
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const actions: Record<string, (() => void) | undefined> = {
      "+": zoomIn,
      "=": zoomIn,
      "-": zoomOut,
      "0": fitView,
      ArrowUp: () => panView("up"),
      ArrowDown: () => panView("down"),
      ArrowLeft: () => panView("left"),
      ArrowRight: () => panView("right"),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <div className={styles.map}>
      <div
        ref={stageRef}
        className={styles.stage}
        role="application"
        aria-label="Interactive map of the Known World"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {!!size && (
          <UncontrolledReactSVGPanZoom
            ref={viewerRef}
            className={styles.canvas}
            width={size.w}
            height={size.h}
            tool={TOOL_AUTO}
            background="transparent"
            SVGBackground="transparent"
            detectAutoPan={false}
            scaleFactor={1.2}
            scaleFactorMin={1}
            scaleFactorMax={1 / fitScale}
            preventPanOutside={true}
            toolbarProps={{ position: "none" }}
            miniatureProps={{
              position: "none",
              background: "transparent",
              width: 0,
              height: 0,
            }}
          >
            <svg width={size.w} height={size.h}>
              <image
                href={src}
                x={(size.w - drawnWidth) / 2}
                y={(size.h - drawnHeight) / 2}
                width={drawnWidth}
                height={drawnHeight}
              />
              <Link
                href="/castles/kings-landing/"
                aria-label="King's Landing"
                title="King's Landing"
                className={styles.marker}
              >
                <circle
                  cx={(size.w - drawnWidth) / 2 + KINGS_LANDING.x * fitScale}
                  cy={(size.h - drawnHeight) / 2 + KINGS_LANDING.y * fitScale}
                  r={KINGS_LANDING.radius * fitScale}
                />
              </Link>
            </svg>
          </UncontrolledReactSVGPanZoom>
        )}
        {editMode && (
          <dl className={styles.debug} aria-hidden="true">
            <dt>Zoom</dt>
            <dd>{debugValue.zoom.toFixed(2)}×</dd>
            <dt>X</dt>
            <dd>{Math.round(debugValue.x)}</dd>
            <dt>Y</dt>
            <dd>{Math.round(debugValue.y)}</dd>
          </dl>
        )}
        <div
          className={styles.fullscreenControl}
          role="group"
          aria-label="Fullscreen controls"
        >
          <button
            type="button"
            className={styles.control}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
          </button>
        </div>
        <div className={styles.dpad} role="group" aria-label="Pan controls">
          <button
            type="button"
            className={cx(styles.control, styles.panUp)}
            aria-label="Pan up"
            title="Pan up (↑)"
            onClick={() => panView("up")}
          >
            <ChevronIcon rotation={0} />
          </button>
          <button
            type="button"
            className={cx(styles.control, styles.panLeft)}
            aria-label="Pan left"
            title="Pan left (←)"
            onClick={() => panView("left")}
          >
            <ChevronIcon rotation={270} />
          </button>
          <button
            type="button"
            className={cx(styles.control, styles.panRight)}
            aria-label="Pan right"
            title="Pan right (→)"
            onClick={() => panView("right")}
          >
            <ChevronIcon rotation={90} />
          </button>
          <button
            type="button"
            className={cx(styles.control, styles.panDown)}
            aria-label="Pan down"
            title="Pan down (↓)"
            onClick={() => panView("down")}
          >
            <ChevronIcon rotation={180} />
          </button>
        </div>
        <div
          className={styles.zoomControls}
          role="group"
          aria-label="Zoom controls"
        >
          <button
            type="button"
            className={styles.control}
            aria-label="Zoom in"
            title="Zoom in (+)"
            onClick={zoomIn}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className={styles.control}
            aria-label="Zoom out"
            title="Zoom out (−)"
            onClick={zoomOut}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className={styles.control}
            aria-label="Reset view"
            title="Reset view (0)"
            onClick={fitView}
          >
            <ResetIcon />
          </button>
        </div>
      </div>
      <p className={styles.hint}>
        Drag to pan · Scroll or pinch to zoom · Keys: + and − zoom, arrows pan,
        0 resets
      </p>
    </div>
  );
}

function ChevronIcon({ rotation }: { rotation: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M4 10 L8 6 L12 10"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`rotate(${rotation} 8 8)`}
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M8 3 L8 13 M3 8 L13 8"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M3 8 L13 8"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <circle
        cx="8"
        cy="8"
        r="2"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M8 1.5 V4.5 M8 11.5 V14.5 M1.5 8 H4.5 M11.5 8 H14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M2 6 V2 H6 M14 6 V2 H10 M2 10 V14 H6 M14 10 V14 H10"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M6 2 V6 H2 M10 2 V6 H14 M6 14 V10 H2 M10 14 V10 H14"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
