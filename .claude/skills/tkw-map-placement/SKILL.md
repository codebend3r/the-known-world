---
name: tkw-map-placement
description: Use when putting something on the world map in this repo, or checking what is already on it. Triggers include "put the battles on the map", "add coordinates for X", "why doesn't this show up on the map", "the marker is in the wrong place", "the pin is in the ocean", "how do I work out x and y", "add a map layer", "which events could be mapped", "map coverage", or any edit to a `coords` field in `content/`.
---

# Map Placement

## Overview

Placing a marker is choosing an `(x, y)` and adding it to a layer. The trap is that **this repo holds two unrelated coordinate spaces, and only one of them is what `coords` means**. Mixing them silently puts Winterfell in the Sunset Sea; nothing in the build complains, because a number is a number.

| Space              | Size         | Who uses it                                                 | King's Landing |
| ------------------ | ------------ | ----------------------------------------------------------- | -------------- |
| **Atlas space**    | `800 x 1400` | Every `coords` field in `content/`, `MapStage`, `MapMarker` | `(590, 830)`   |
| **Natural pixels** | `10000x8300` | `components/WorldMap` only, for the `/maps` raster          | `(1955, 4619)` |

They are not two scales of one picture. As a fraction of image width, atlas King's Landing sits at 73.8% and natural King's Landing at 19.6%. No affine transform relates them, because atlas space is a Westeros-only schematic (`aspect-ratio: 4 / 7`, `MapStage.module.scss`) while the raster is the whole known world including Essos and Sothoryos.

Consequences that drive everything below:

- **Atlas space covers Westeros only.** All 146 castles fall in `x 100..800`, `y 105..1230`. Nothing on Essos or the Summer Isles can be placed, which is why 22 of 53 events are permanently unplaceable rather than merely unwritten.
- **`WorldMap` is not the layer surface.** It renders the raster plus one hardcoded King's Landing hotspot at natural pixels. Markers there would need natural pixels, which no content entry carries.
- **`MapStage` is the layer surface** and draws atlas space 1:1 into its viewBox, so `coords` go straight through with no projection.

## The coordinate rules

| Rule                  | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| Origin                | Top left, `y` grows downward (SVG convention)                                  |
| Valid range           | `0 <= x <= 800`, `0 <= y <= 1400`, inclusive both ends                         |
| Source of truth       | `MAP_BOUNDS` in `lib/map.ts`, consumed by `MapStage`                           |
| Units                 | Unitless. Castle Black `y: 108` to Starfall `y: 1230` is the whole of Westeros |
| Where the check lives | `isWithinMapBounds()`, gated by `lib/content-integrity.test.ts`                |

Sunspear at `x: 800` sits exactly on the right edge, so the bound is inclusive by design, not by accident. Do not tighten it.

## Deriving coordinates for a new place

Preferred order. Stop at the first that applies.

1. **Reuse a castle's coordinates.** If the entry happens _at_ a place already in `content/castles/`, copy that castle's `coords` verbatim. This is the only method that cannot drift, and it produces intentional stacks (11 entries sit on King's Landing).
2. **Interpolate between two known castles.** Atlas space is linear, so a place a third of the way from Riverrun `(430, 730)` to the Twins `(440, 645)` is `(433, 702)`. Round to integers.
3. **Do not place it.** Leave `coords` absent. An absent marker is correct; a guessed one is a lie a reader cannot detect.

Never invent a coordinate from the raster in `public/map/`. Those are natural pixels and belong to the other space.

### When "reuse the castle" does not apply

`location` is free text and often names a castle as a bearing rather than a site. Place only when the castle _is_ the site.

| `location` phrasing                              | Place? | Example                                                      |
| ------------------------------------------------ | ------ | ------------------------------------------------------------ |
| At, in, on, siege of                             | yes    | `Harrenhal, on the shore of the Gods Eye`                    |
| Near, around, beneath, outside                   | yes    | `The Lannister siege camps around Riverrun`                  |
| West of, below, three days from                  | no     | `Oxcross ... west of the Golden Tooth`                       |
| A list of separate sites                         | no     | `The Prince's Pass, the Boneway, and Sunspear`               |
| A region, sea, river, forest, or whole continent | no     | `the Red Fork`, `Dorne`, `Meereen`, `The skies of the world` |

## Layer wiring checklist

Adding a new placeable collection touches five files and nothing else.

1. `lib/schemas.ts` gets `coords: CoordsSchema.optional()` on the collection's schema.
2. `lib/map.ts` gets the layer name in `MAP_LAYERS`, a branch in `placementHref()`, and a branch in `selectPlacements()`.
3. `components/MapMarker/MapMarker.tsx` gets a `case` in `Glyph` with a shape and colour no existing layer uses, plus its class in `MapMarker.module.scss` built from `styles/globals.scss` tokens.
4. `components/MapLayerToggle` needs no edit; it iterates `MAP_LAYERS`.
5. `lib/content-integrity.ts` gets the collection in `placementSources` so out-of-bounds coordinates fail CI.

Glyphs currently in use, so a new layer must avoid all of them:

| Layer        | Shape             | Token             |
| ------------ | ----------------- | ----------------- |
| `castle`     | circle r6         | `--tkw-gold`      |
| `town`       | circle r4         | `--tkw-ink-muted` |
| `ruin`       | two crossed lines | `--tkw-extinct`   |
| `watchtower` | two stacked rects | `--tkw-ink-body`  |
| `holdfast`   | square 10x10      | `--tkw-contested` |
| `battle`     | filled triangle   | `--tkw-deposed`   |
| `event`      | hollow diamond    | `--tkw-attainted` |

## Failure classes

| Class                      | Symptom                                         | Cause                                                                                                                                         |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinate space confusion | Marker far off the landmass, or absent entirely | Natural pixels written into `coords`, or atlas units fed to `WorldMap`                                                                        |
| Out of bounds              | Marker never paints; no error anywhere          | `x > 800` or `y > 1400`, usually the previous class                                                                                           |
| Unanchored stack           | Two unrelated entries on one point              | Copy-pasted `coords` block; a stack is only legitimate with a castle in it                                                                    |
| Suspicious cluster         | Two markers overlap at every zoom               | Distinct places under 5 atlas units apart                                                                                                     |
| Marker on a draft entry    | Entry has `coords` but never appears            | `generateStaticParams` skips drafts, so the detail page is not built. `selectPlacements()` drops drafts to stop the pin linking into the void |
| Placeable but unplaced     | Entry is invisible on the map for no reason     | `location` names a castle that has coordinates, entry has none                                                                                |
| Silently defaulted         | A pin in the Shivering Sea at `(0, 0)`          | Treating a missing `coords` as a zero instead of an absence                                                                                   |

## Quick Reference

```bash
# Full placement report: coverage, bounds, stacks, clusters, candidates
bun .claude/skills/tkw-map-placement/audit-placement.ts

# Machine-readable, for batching
bun .claude/skills/tkw-map-placement/audit-placement.ts --json

# What CI gates: bounds + every other content cross-reference
bun test lib/content-integrity.test.ts

# Layer selection and bounds logic
bun test lib/map.test.ts
```

Frontmatter shape, identical for castles, battles, and events:

```yaml
coords:
  x: 590
  y: 830
```

Current coverage, from the audit:

| Collection | Placed  | What the remainder looks like                                                          |
| ---------- | ------- | -------------------------------------------------------------------------------------- |
| castles    | 146/146 | none left; `coords` is required by `CastleSchema`                                      |
| battles    | 25/72   | 47 unplaced: 1 has no `location` at all, the rest name wars, regions, rivers, or Essos |
| events     | 19/53   | 34 unplaced: 22 are on Essos or the Summer Isles, 12 name a region, sea, or forest     |

## Common mistakes

| Mistake                                                          | Why it goes wrong                                                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Reading coordinates off `the-known-world-enhanced.jpg`           | That yields natural pixels. Every value lands outside atlas bounds and the marker disappears.              |
| Scaling atlas units by `10000/800` to reach the raster           | The two spaces are different projections of different areas, not one picture at two zooms.                 |
| Adding markers to `components/WorldMap`                          | It is the raster viewer for `/maps`. Layers live on `MapStage`, whose viewBox _is_ atlas space.            |
| Treating stacked coordinates as a bug                            | Reusing a seat's coordinates is the intended result. A stack is suspicious only when no castle anchors it. |
| Placing an entry whose `location` names a bearing                | `west of the Golden Tooth` is not the Golden Tooth. Leave it absent.                                       |
| Defaulting missing `coords` to `{ x: 0, y: 0 }`                  | `(0, 0)` is a valid in-bounds point in the far north-west sea, so the bad marker looks real.               |
| Trying to place an Essos event                                   | Atlas space stops at Westeros. 18 Essos and 4 Summer Isles events have nowhere to go.                      |
| Trusting the audit's `PLACEABLE` list without reading `location` | It matches castle names by whole word. It cannot tell "at Winterfell" from "three days from Winterfell".   |
| Adding a bounds check to a new script                            | `isWithinMapBounds()` and `MAP_BOUNDS` already exist in `lib/map.ts`. A second copy will drift.            |

## Scope

The audit is read-only. It reports; it never edits markdown or moves a marker.

Two things this skill deliberately does not do:

- **Mount a layered map page.** `MapStage` needs a Westeros-only base image at 4:7. `public/map/` holds only 10000x8300 world rasters and a 7680x7680 square, so the plate has no backdrop to draw. Adding the image is the prerequisite, not the placement work.
- **Re-derive the 146 castle coordinates against the raster.** That is a separate project with its own review burden, and it would invalidate every placement made against the current space.

## Related skills

- `tkw-content-triage`: ranks which entries are worth populating before they are worth placing
- `tkw-image-optimize`: owns `public/map/` asset weight, including the 11 MB raster
