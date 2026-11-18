"use client";

import { useEffect, useRef, useState } from "react";
import { ReactSVGPanZoom, TOOL_AUTO, type Value } from "react-svg-pan-zoom";
import type { KeyboardEvent, ReactNode } from "react";
import { MAP_BOUNDS } from "@/lib/map";
import {
  CANVAS_KEY_SHORTCUTS,
  canvasKeyAction,
  panStep,
  type PanDirection,
} from "@/lib/pan-zoom";
import styles from "@/components/MapStage/MapStage.module.scss";

// The stage viewBox *is* atlas space: every `coords` pair in `content/` is an
// (x, y) inside this box, drawn 1:1 with no projection.
const { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT } = MAP_BOUNDS;

const ZOOM_STEP = 1.5;

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
  const [value, setValue] = useState<Value | null>(null);

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
    const { x, y } = panStep({
      direction,
      width: size.w,
      height: size.h,
      scale: value?.a ?? 1,
    });
    viewer.pan(x, y);
  };

  // Pan and zoom are functionality, not decoration, so WCAG 2.1.1 puts them on
  // the keyboard too. The library owns the transform, so this drives its own
  // imperative handles rather than rebuilding a `Value` by hand.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const withViewer = (run: (viewer: ReactSVGPanZoom) => void) => () => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      run(viewer);
    };
    const action = canvasKeyAction({
      key: event.key,
      handlers: {
        zoomIn: withViewer((viewer) => viewer.zoomOnViewerCenter(ZOOM_STEP)),
        zoomOut: withViewer((viewer) =>
          viewer.zoomOnViewerCenter(1 / ZOOM_STEP),
        ),
        reset: withViewer((viewer) => viewer.fitToViewer()),
        pan: panView,
      },
    });
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
        aria-keyshortcuts={CANVAS_KEY_SHORTCUTS}
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
