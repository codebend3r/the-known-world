"use client";

import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";
import Link from "next/link";
import { parseAsBoolean, useQueryState } from "nuqs";
import {
  TOOL_AUTO,
  UncontrolledReactSVGPanZoom,
  type Value,
} from "react-svg-pan-zoom";
import { cx } from "@/lib/cx";
import type { WorldMapMarker } from "@/lib/map";
import netlifyImageLoader from "@/lib/netlify-image-loader";
import { PAN_DIRECTIONS, type PanDirection } from "@/lib/pan-zoom";
import styles from "@/components/WorldMap/WorldMap.module.scss";

const ZOOM_STEP = 1.5;
const PAN_STEP_RATIO = 0.2;
// Advertised on the stage so assistive tech can list the canvas shortcuts
// rather than leaving the visible hint line as the only place they exist.
const KEY_SHORTCUTS = "ArrowUp ArrowDown ArrowLeft ArrowRight + - 0";
const INITIAL_VIEW = { zoom: 5, x: -1495, y: -1940 };
// Radius, in natural pixels, of the (invisible) click target around each
// printed seat icon — kept tight since neighbouring towns (Hayford and Rosby
// by King's Landing, Lordsport by Pyke) sit only ~50-100 natural pixels away.
const MARKER_RADIUS = 25;
// The popover is a fixed-width card (see `.popover` in the module) anchored
// on the hotspot. These mirror its CSS box so the card can be clamped inside
// the stage and flipped below the pin when there is no room above it.
const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT_ESTIMATE = 230;
const POPOVER_EDGE_GUTTER = 12;
const POPOVER_ID = "world-map-popover";
// The raster is an 11 MB, 10000px JPEG, and readers zoom deep into it, so it
// is always requested in full, at once, and never through the CDN. A
// CDN-resized copy this wide is drawn beneath it as a stand-in that lands in
// a fraction of the time; once the full raster paints, it covers the copy.
const PREVIEW_WIDTH = 2048;
const PREVIEW_QUALITY = 70;

type Props = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  markers: ReadonlyArray<WorldMapMarker>;
};

type PopoverProps = {
  marker: WorldMapMarker;
  anchor: { x: number; y: number };
  stageWidth: number;
};

function MarkerPopover({ marker, anchor, stageWidth }: PopoverProps) {
  const halfWidth = POPOVER_WIDTH / 2;
  const lowest = Math.min(halfWidth + POPOVER_EDGE_GUTTER, stageWidth / 2);
  const highest = Math.max(
    stageWidth - halfWidth - POPOVER_EDGE_GUTTER,
    stageWidth / 2,
  );
  const clampedX = Math.min(Math.max(anchor.x, lowest), highest);
  const placement = anchor.y < POPOVER_HEIGHT_ESTIMATE ? "below" : "above";
  const shift = clampedX - anchor.x;
  // Clamping slides the card sideways; the arrow and the pop's origin slide
  // back by the same amount so both still point at the pin.
  const pinX = halfWidth - shift;

  return (
    <div
      className={styles.anchor}
      style={{ left: anchor.x, top: anchor.y }}
      data-placement={placement}
    >
      <span className={styles.pulse} aria-hidden="true" />
      <span className={cx(styles.pulse, styles.pulseLate)} aria-hidden="true" />
      <div className={styles.shifter} style={{ translate: `${shift}px 0` }}>
        <aside
          id={POPOVER_ID}
          role="tooltip"
          className={styles.popover}
          style={{
            transformOrigin: `${pinX}px ${placement === "above" ? "100%" : "0"}`,
          }}
        >
          <span
            className={styles.arrow}
            style={{ insetInlineStart: pinX }}
            aria-hidden="true"
          />
          <p className={styles.eyebrow}>{marker.type}</p>
          <h3 className={styles.title}>{marker.name}</h3>
          {!!marker.house && <p className={styles.house}>{marker.house}</p>}
          {!!marker.summary && (
            <p className={styles.summary}>{marker.summary}</p>
          )}
          <p className={styles.cta}>Open the entry</p>
        </aside>
      </div>
    </div>
  );
}

export function WorldMap({ src, naturalWidth, naturalHeight, markers }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<UncontrolledReactSVGPanZoom | null>(null);
  const hasSeededViewRef = useRef(false);
  const geometryRef = useRef<{
    size: { w: number; h: number };
    fitScale: number;
  } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [isEditMode] = useQueryState(
    "editMode",
    parseAsBoolean.withDefault(false),
  );
  const [debugValue, setDebugValue] = useState(INITIAL_VIEW);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const previewSrc = netlifyImageLoader({
    src,
    width: PREVIEW_WIDTH,
    quality: PREVIEW_QUALITY,
  });

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
    if (!isEditMode) return;
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
  }, [isEditMode]);

  // Tabbing to a hotspot that the current pan has scrolled out of view would
  // leave focus on something invisible, so the view recentres on it at the
  // current zoom. A hotspot already on screen (the usual case for a mouse
  // click, which also focuses) is left where it is to avoid a jump.
  // Where a hotspot's centre currently sits on the stage, in screen pixels,
  // after the viewer's pan and zoom.
  const markerScreenPoint = (marker: WorldMapMarker) => {
    const inner = viewerRef.current?.Viewer;
    if (!inner || !size) return null;
    const value = inner.getValue();
    const svgX = (size.w - drawnWidth) / 2 + marker.x * fitScale;
    const svgY = (size.h - drawnHeight) / 2 + marker.y * fitScale;
    return {
      svgX,
      svgY,
      screenX: value.a * svgX + value.e,
      screenY: value.a * svgY + value.f,
    };
  };

  const revealMarker = (marker: WorldMapMarker) => {
    const inner = viewerRef.current?.Viewer;
    const point = markerScreenPoint(marker);
    if (!inner || !size || !point) return;
    const value = inner.getValue();
    const isVisible =
      point.screenX >= 0 &&
      point.screenX <= size.w &&
      point.screenY >= 0 &&
      point.screenY <= size.h;
    if (isVisible) return;
    inner.setValue({
      ...value,
      e: size.w / 2 - value.a * point.svgX,
      f: size.h / 2 - value.a * point.svgY,
    });
  };

  const activeMarker = markers.find((marker) => marker.slug === activeSlug);

  const showPopover = (marker: WorldMapMarker) => {
    const point = markerScreenPoint(marker);
    if (!point) return;
    setAnchor({ x: point.screenX, y: point.screenY });
    setActiveSlug(marker.slug);
  };

  const hidePopover = (marker: WorldMapMarker) => {
    setActiveSlug((current) => (current === marker.slug ? null : current));
  };

  // The card follows its pin through wheel zoom and drag-pans, which the
  // viewer applies without telling us, so the anchor is re-read each frame
  // while a card is open (the same polling the debug overlay needs).
  useEffect(() => {
    if (!activeMarker) return;
    let frame: number;
    const tick = () => {
      const point = markerScreenPoint(activeMarker);
      if (point) {
        setAnchor((prev) =>
          prev?.x === point.screenX && prev?.y === point.screenY
            ? prev
            : { x: point.screenX, y: point.screenY },
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `markerScreenPoint` closes over layout values already in this list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMarker, size, fitScale, drawnWidth, drawnHeight]);

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
        aria-keyshortcuts={KEY_SHORTCUTS}
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
            {/* `role="group"`, not `role="img"`: the pins drawn on top are
                links, and `img` would prune them out of the accessibility
                tree. The artwork itself carries no text, so it is hidden and
                the group's label stands for it. */}
            <svg
              width={size.w}
              height={size.h}
              role="group"
              aria-label="Map of the Known World"
            >
              <image
                href={previewSrc}
                x={(size.w - drawnWidth) / 2}
                y={(size.h - drawnHeight) / 2}
                width={drawnWidth}
                height={drawnHeight}
                aria-hidden="true"
              />
              <image
                href={src}
                x={(size.w - drawnWidth) / 2}
                y={(size.h - drawnHeight) / 2}
                width={drawnWidth}
                height={drawnHeight}
                aria-hidden="true"
              />
              {markers.map((marker) => (
                <Link
                  key={marker.slug}
                  href={marker.href}
                  aria-label={marker.name}
                  className={styles.marker}
                  aria-describedby={
                    marker.slug === activeSlug ? POPOVER_ID : undefined
                  }
                  onPointerEnter={(event: PointerEvent) => {
                    if (event.pointerType === "mouse") showPopover(marker);
                  }}
                  onPointerLeave={() => hidePopover(marker)}
                  onFocus={(event: FocusEvent) => {
                    if (event.currentTarget !== event.target) return;
                    revealMarker(marker);
                    showPopover(marker);
                  }}
                  onBlur={() => hidePopover(marker)}
                >
                  <circle
                    cx={(size.w - drawnWidth) / 2 + marker.x * fitScale}
                    cy={(size.h - drawnHeight) / 2 + marker.y * fitScale}
                    r={MARKER_RADIUS * fitScale}
                  />
                </Link>
              ))}
            </svg>
          </UncontrolledReactSVGPanZoom>
        )}
        {!!activeMarker && !!anchor && !!size && (
          <MarkerPopover
            key={activeMarker.slug}
            marker={activeMarker}
            anchor={anchor}
            stageWidth={size.w}
          />
        )}
        {isEditMode && (
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
