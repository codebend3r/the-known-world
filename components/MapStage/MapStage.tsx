"use client";

import { useEffect, useRef, useState } from "react";
import { ReactSVGPanZoom, TOOL_AUTO, type Value } from "react-svg-pan-zoom";
import type { KeyboardEvent, ReactNode } from "react";
import { MAP_BOUNDS } from "@/lib/map";
import styles from "@/components/MapStage/MapStage.module.scss";

// The stage viewBox *is* atlas space: every `coords` pair in `content/` is an
// (x, y) inside this box, drawn 1:1 with no projection.
const { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT } = MAP_BOUNDS;

const ZOOM_STEP = 1.5;
const PAN_STEP_RATIO = 0.2;
const KEY_SHORTCUTS = "ArrowUp ArrowDown ArrowLeft ArrowRight + - 0";

type PanDirection = "up" | "down" | "left" | "right";

// Signs are SVG-content deltas: panning the view up shifts the drawing down.
const PAN_DIRECTIONS: Record<PanDirection, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

type Props = {
  children: ReactNode;
  svgUrl: string;
  /** Names the canvas for assistive tech, and the inner `<svg>` group with it. */
  label?: string;
};

export function MapStage({ children, svgUrl, label = "Map" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ReactSVGPanZoom | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [value, setValue] = useState<Value>({} as Value);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const panView = (direction: PanDirection) => {
    const viewer = viewerRef.current;
    if (!viewer || !size) return;
    const { x, y } = PAN_DIRECTIONS[direction];
    const scale = value.a ?? 1;
    viewer.pan(
      (x * size.w * PAN_STEP_RATIO) / scale,
      (y * size.h * PAN_STEP_RATIO) / scale,
    );
  };

  // Pan and zoom are functionality, not decoration, so WCAG 2.1.1 puts them on
  // the keyboard too. The library owns the transform, so this drives its own
  // imperative handles rather than rebuilding a `Value` by hand.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewer = viewerRef.current;
    const actions: Record<string, (() => void) | undefined> = {
      "+": () => viewer?.zoomOnViewerCenter(ZOOM_STEP),
      "=": () => viewer?.zoomOnViewerCenter(ZOOM_STEP),
      "-": () => viewer?.zoomOnViewerCenter(1 / ZOOM_STEP),
      "0": () => viewer?.fitToViewer(),
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
    <div ref={containerRef} className={styles.stage}>
      <div
        className={styles.inner}
        role="application"
        aria-label={label}
        aria-keyshortcuts={KEY_SHORTCUTS}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {size && (
          <ReactSVGPanZoom
            ref={viewerRef}
            width={size.w}
            height={size.h}
            tool={TOOL_AUTO}
            onChangeTool={() => {}}
            value={value}
            onChangeValue={setValue}
            background="transparent"
            SVGBackground="transparent"
            detectAutoPan={false}
            scaleFactor={1.2}
            scaleFactorMin={0.5}
            scaleFactorMax={6}
            preventPanOutside={true}
            toolbarProps={{ position: "none" }}
            miniatureProps={{
              position: "none",
              background: "transparent",
              width: 0,
              height: 0,
            }}
          >
            {/* `role="group"` rather than `img`: the markers layered on top are
                links, and `img` would prune them away. */}
            <svg
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              role="group"
              aria-label={label}
            >
              <image
                href={svgUrl}
                x={0}
                y={0}
                width={VIEWBOX_WIDTH}
                height={VIEWBOX_HEIGHT}
                aria-hidden="true"
              />
              {children}
            </svg>
          </ReactSVGPanZoom>
        )}
      </div>
    </div>
  );
}
