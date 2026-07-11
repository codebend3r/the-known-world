"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { TOOL_AUTO, UncontrolledReactSVGPanZoom } from "react-svg-pan-zoom";
import { cx } from "@/lib/cx";
import styles from "@/components/WorldMap/WorldMap.module.scss";

const ZOOM_STEP = 1.5;
const PAN_STEP_RATIO = 0.2;

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
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [editMode] = useQueryState(
    "editMode",
    parseAsBoolean.withDefault(false),
  );
  // Matches the library's fit/identity default: scale 1, no translation.
  const [debugValue, setDebugValue] = useState({ zoom: 1, x: 0, y: 0 });

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
    return () => ro.disconnect();
  }, []);

  // The SVG viewbox matches the viewer and the map image is drawn centered
  // at fitted size within it, so the library's default view (identity
  // matrix) already shows the whole map: scale 1 = fit, no seeding needed.
  const fitScale = !!size
    ? Math.min(size.w / naturalWidth, size.h / naturalHeight)
    : 0;
  const drawnWidth = naturalWidth * fitScale;
  const drawnHeight = naturalHeight * fitScale;

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
            <FitIcon />
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

function FitIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        d="M6 3 H3 V6 M10 3 H13 V6 M13 10 V13 H10 M6 13 H3 V10"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
