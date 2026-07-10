# Interactive world map: Design Spec

**Date:** 2026-07-09
**Status:** Approved for implementation
**Scope:** `app/maps/page.tsx`, new `components/WorldMap/` (component, SCSS module, test, index), no schema or content changes.

## Overview

Replace the `/maps` coming-soon stub with an interactive viewer for the full
world map (`public/map/map_natural_8K.jpg`, 7680×7680). The map pans and zooms
with mouse, touch, on-screen controls, and keyboard shortcuts. The page keeps
the standard `ParchmentLayout` shell, which already caps content width at
1600px.

## Goals

- A pannable, zoomable world map that works on desktop (drag + scroll wheel)
  and mobile (drag + pinch) without extra dependencies.
- On-screen controls — zoom in, zoom out, reset, and a four-way pan pad — with
  touch-friendly targets so mobile users are not dependent on gestures.
- Keyboard shortcuts (`+`/`=`, `-`, arrow keys, `0`) for the same operations.
- Initial view fits the whole map, centered, at any viewport size.

## Non-goals

- ❌ Castle/battle markers or clickable regions (future work — the legacy
  `MapStage`/`MapMarker` components stay untouched for that effort).
- ❌ Tiled/progressive image loading; the single 16 MB JPEG is served as-is.
- ❌ Persisting the viewport (zoom/position) across visits or in the URL.
- ❌ A minimap / overview inset.

## Approach

Reuse `react-svg-pan-zoom` (already a dependency, used by the legacy
`MapStage`). The raster map is wrapped in an SVG `<image>` whose logical size
equals the natural raster size (7680×7680), so a matrix scale of `1` equals
native pixels.

Alternatives considered:

- **Hand-rolled pointer-events pan/zoom on an `<img>`** — full control but
  re-implements pinch math, clamping, and inertia the library already handles.
- **Extending the legacy `MapStage`** — its API (marker children, fixed
  800×1400 viewbox) is shaped for the shelved regional-map feature; bolting
  controls onto it would tangle two unrelated designs.

## Behavior

- **Viewer**: controlled `ReactSVGPanZoom` with `tool={TOOL_AUTO}` (drag pans,
  double-click zooms), `detectWheel` + `detectPinchGesture` on by default,
  `preventPanOutside` so the map can't be flung off-screen. Toolbar and
  miniature are disabled; our own controls replace them.
- **Value state**: `useState<Value | null>(null)`. The viewer accepts `null`
  and falls back to its internal default; every interaction emits a complete
  `Value` through `onChangeValue`. No type casts (unlike the legacy
  `{} as Value`).
- **Programmatic ops** go through a ref to the viewer instance:
  `zoomOnViewerCenter`, `pan`, `setPointOnViewerCenter`.
- **Initial fit**: once the container is measured, an effect centers the map at
  fit scale via `setPointOnViewerCenter(3840, 3840, min(w/7680, h/7680))`.
  Later container resizes keep the user's current view.
- **Zoom bounds**: `scaleFactorMin: 0.02` (whole map fits even on a small
  phone), `scaleFactorMax: 1` (100% = native 8K pixels). Button/keyboard zoom
  step is ×1.5.
- **Pan step** (buttons/keys): 20% of the viewer dimension per press,
  converted to SVG units by dividing by the current scale, so a press always
  moves the view the same on-screen distance at any zoom. Arrows move the
  viewpoint (content shifts the opposite way), matching map-app convention.
- **Keyboard**: the stage is focusable (`tabIndex=0`,
  `role="application"`, `aria-label`). `+`/`=` zoom in, `-` zoom out, arrow
  keys pan, `0` resets to the fitted view. Handled keys call
  `preventDefault()` so arrows don't scroll the page.
- **Loading**: a CSS-only “Unfurling the map…” line sits behind the
  transparent viewer and is covered once the JPEG paints. No JS state.
- A caption under the map lists the gestures and shortcuts.

## Visual structure

```
+--------------------------------------------------------------+
| PageHeading: compass glyph, "Maps", subtitle, filigree rule   |
+--------------------------------------------------------------+
| .stage (100% width, clamp(320px, 70vh, 900px) tall, framed)  |
|                                                              |
|                     [ the map ]                              |
|                                                              |
|  [d-pad ↑←→↓]                              [ + ]             |
|   bottom-left                              [ − ]             |
|                                            [ ⤢ ] bottom-right|
+--------------------------------------------------------------+
| caption: Drag to pan · Scroll or pinch to zoom · + − ↑↓←→ 0  |
+--------------------------------------------------------------+
```

- Controls overlay the stage with `position: absolute`; the d-pad is a named
  `grid-template-areas` grid (`". up ." "left . right" ". down ."`).
- Buttons are ≥44×44px, parchment-styled from global tokens (`--vellum`,
  `--ink`, `--gold-leaf` hover), with `aria-label`s and `title` tooltips that
  include the shortcut.

## Components

| File                                       | Kind    | Change                                                                                                                                                 |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/WorldMap/WorldMap.tsx`         | **new** | Client component: measures the stage (ResizeObserver), renders the viewer, controls, keyboard handling. Props: `{ src, naturalWidth, naturalHeight }`. |
| `components/WorldMap/WorldMap.module.scss` | **new** | Stage frame, loading line, control clusters, d-pad grid areas, breakpoint tweaks.                                                                      |
| `components/WorldMap/WorldMap.test.tsx`    | **new** | Mocks `react-svg-pan-zoom`; asserts sizing, initial fit, button + keyboard ops, a11y labels.                                                           |
| `components/WorldMap/index.ts`             | **new** | Barrel export.                                                                                                                                         |
| `app/maps/page.tsx`                        | modify  | Swap `ComingSoonPage` for `PageHeading` + `WorldMap`; update metadata description.                                                                     |

## Testing

Component tests mock `ReactSVGPanZoom` as a class stub whose instance methods
delegate to `vi.hoisted` spies, mirroring the `MapStage.test.tsx`
ResizeObserver pattern:

- viewer receives the measured width/height once the observer fires;
- the SVG `<image>` uses `src` and the natural dimensions;
- initial fit calls `setPointOnViewerCenter(3840, 3840, fitScale)`;
- zoom in/out buttons and `+`/`-` keys call `zoomOnViewerCenter(1.5 | 1/1.5)`;
- pan buttons and arrow keys call `pan()` with the expected signed SVG deltas;
- reset button and `0` re-issue the centered fit;
- every control exposes an `aria-label`.
