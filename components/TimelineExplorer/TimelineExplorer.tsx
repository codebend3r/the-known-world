"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TimelineChart } from "@/components/TimelineChart";
import { TimelineMinimap } from "@/components/TimelineMinimap";
import {
  DEFAULT_ZOOM_INDEX,
  PX_PER_YEAR,
  ZOOM_LEVELS,
  layoutTimeline,
  yForYear,
  yearForY,
  type TimelineSource,
} from "@/lib/timeline";
import styles from "@/components/TimelineExplorer/TimelineExplorer.module.scss";

type TimelineExplorerProps = {
  source: TimelineSource;
};

const CHART_BODY_ID = "timeline-chart";
const MAX_ZOOM_INDEX = ZOOM_LEVELS.length - 1;

// `useLayoutEffect` warns during server rendering; the scroll-anchoring it
// drives only runs after a client interaction, so fall back to `useEffect`
// on the server where `window` is absent.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const clampZoom = (index: number): number =>
  Math.min(MAX_ZOOM_INDEX, Math.max(0, index));

export function TimelineExplorer({ source }: TimelineExplorerProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const pxPerYear = PX_PER_YEAR * ZOOM_LEVELS[zoomIndex];
  const model = useMemo(
    () => layoutTimeline({ source, pxPerYear }),
    [source, pxPerYear],
  );

  // Pin the year under a focal point (viewport centre for the buttons, the
  // cursor for wheel-zoom) so the view stays put across a re-layout.
  const anchorRef = useRef<{ year: number; viewportY: number } | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const zoomTo = (nextIndex: number, focalViewportY: number) => {
    const index = clampZoom(nextIndex);
    if (index === zoomIndex) return;
    const body = document.getElementById(CHART_BODY_ID);
    if (body) {
      const bodyTop = body.getBoundingClientRect().top + window.scrollY;
      const y = focalViewportY + window.scrollY - bodyTop;
      anchorRef.current = {
        year: yearForY({ y, minYear: source.minYear, pxPerYear }),
        viewportY: focalViewportY,
      };
    }
    setZoomIndex(index);
  };

  useIsomorphicLayoutEffect(() => {
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (!anchor) return;
    const body = document.getElementById(CHART_BODY_ID);
    if (!body) return;
    const bodyTop = body.getBoundingClientRect().top + window.scrollY;
    const y = yForYear({
      year: anchor.year,
      minYear: source.minYear,
      pxPerYear,
    });
    window.scrollTo({ top: Math.max(0, bodyTop + y - anchor.viewportY) });
  }, [pxPerYear, source.minYear]);

  // Ctrl / Cmd + wheel zooms around the cursor, matching map conventions.
  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      zoomTo(zoomIndex + (event.deltaY < 0 ? 1 : -1), event.clientY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomIndex, pxPerYear]);

  const viewportCentre = (): number =>
    typeof window !== "undefined" ? window.innerHeight / 2 : 0;

  return (
    <div className={styles.explorer}>
      <div className={styles.chartWrap} ref={chartRef}>
        <TimelineChart model={model} bodyId={CHART_BODY_ID} />
      </div>
      <TimelineMinimap ticks={model.ticks} targetId={CHART_BODY_ID} />
      <div
        className={styles.zoom}
        role="group"
        aria-label="Timeline zoom"
        title="Zoom the timeline (Ctrl / ⌘ + scroll)"
      >
        <button
          type="button"
          className={styles.zoomButton}
          onClick={() => zoomTo(zoomIndex + 1, viewportCentre())}
          disabled={zoomIndex === MAX_ZOOM_INDEX}
          aria-label="Zoom in"
        >
          +
        </button>
        <span className={styles.zoomLevel} aria-live="polite">
          {ZOOM_LEVELS[zoomIndex]}&#215;
        </span>
        <button
          type="button"
          className={styles.zoomButton}
          onClick={() => zoomTo(zoomIndex - 1, viewportCentre())}
          disabled={zoomIndex === 0}
          aria-label="Zoom out"
        >
          &#8722;
        </button>
      </div>
    </div>
  );
}
