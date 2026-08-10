# Baseline: `map-placement`

**Date:** 2026-08-05
**Script:** `bun .claude/skills/map-placement/audit-placement.ts`
**Scope:** `content/battles/`, `content/events/`, `lib/schemas.ts`, `lib/map.ts`, `lib/content-integrity.ts`, `components/MapMarker`, `components/MapLayerToggle`, `components/MapStage`

## What the baseline run found

```
ATLAS SPACE 800x1400, cluster radius 5

PLACEMENT COVERAGE
  castles   146/146  100%
  battles     0/72   0%
  events      0/53   0%

OUT OF BOUNDS (0)
DUPLICATE COORDINATES (0)
CLUSTERED WITHIN 5 UNITS (3)
  castles/wickenden ~ castles/duskendale   5.0 units apart
  castles/maidenpool ~ castles/redfort     5.0 units apart
  castles/red-keep ~ castles/kings-landing 2.0 units apart

PLACEABLE, UNPLACED (48)
NO CASTLE MATCH (77)
```

`CoordsSchema` was reachable from two schemas, not one: `CastleSchema.coords` (required) and the `EventSchema.location` union `z.union([z.string(), CoordsSchema])`. Zero of 53 events used the coordinate arm of that union, so in practice castles were the only placeable collection.

### The finding that reshaped the work

The repo holds **two unrelated coordinate spaces**, and the one `coords` is written in has no page rendering it.

| Space          | Size       | Consumers                                      | King's Landing |
| -------------- | ---------- | ---------------------------------------------- | -------------- |
| Atlas          | 800 x 1400 | all `content/` coords, `MapStage`, `MapMarker` | (590, 830)     |
| Natural pixels | 10000x8300 | `components/WorldMap` only                     | (1955, 4619)   |

They are not two zooms of one image. As a fraction of image width King's Landing sits at 73.8% in atlas space and 19.6% in natural pixels. Spot checks against the raster confirm no affine transform relates them: the Wall-to-Winterfell gap implies a y scale of about 2.0, while the Wall-to-Bear-Island gap implies about 1.1.

Two further measured facts:

- `components/MapStage`, `components/MapMarker`, `components/MapLayerToggle`, and `selectVisibleCastles` are **referenced by nothing outside their own tests**. The only mounted map is `app/maps/page.tsx`, which renders `WorldMap` with the 10000x8300 raster and exactly **one** marker: a hardcoded King's Landing hotspot at natural (1955, 4619). The map therefore rendered one place, not 146.
- The 2026-07-09 interactive world map spec lists markers as a non-goal for `WorldMap` and says the legacy `MapStage`/`MapMarker` components stay untouched for that effort.

## What was placed

44 entries gained `coords`, all by copying the coordinates of a castle already in `content/castles/`. No coordinate was invented.

| Collection | Before  | After   |
| ---------- | ------- | ------- |
| castles    | 146/146 | 146/146 |
| battles    | 0/72    | 25/72   |
| events     | 0/53    | 19/53   |

**Battles (25)**: `battle-of-summerhall`, `storming-of-the-dragonpit`, `burning-of-harrenhal`, `taking-and-recapture-of-moat-cailin`, `sack-of-kings-landing`, `battle-in-the-whispering-wood`, `capture-and-sack-of-winterfell`, `siege-of-riverrun`, `second-battle-of-tumbleton`, `fight-at-the-bridge-of-skulls`, `battle-of-ashford`, `first-battle-of-the-last-storm`, `wildling-assault-on-castle-black`, `battle-of-the-blackwater`, `storming-of-pyke`, `battle-of-the-golden-tooth`, `battle-of-the-bells`, `battle-at-duskendale`, `first-battle-of-tumbleton`, `battle-beneath-the-wall`, `red-wedding`, `death-of-rhaenys-at-the-hellholt`, `siege-of-storms-end`, `sack-of-harrenhal`, `battle-of-the-camps`.

**Events (19)**: `the-purple-wedding`, `death-of-tywin-lannister`, `election-of-jon-snow`, `lann-the-clever-wins-casterly-rock`, `durran-godsgrief-raises-storms-end`, `assassination-of-jon-snow`, `wedding-of-robert-and-cersei`, `the-nights-king`, `fall-of-bran-stark`, `great-council-of-101`, `cerseis-walk-of-atonement`, `murder-of-renly-baratheon`, `tragedy-at-summerhall`, `death-of-jon-arryn`, `founding-of-kings-landing`, `death-of-the-dragons`, `exodus-of-house-targaryen`, `founding-of-winterfell`, `execution-of-eddard-stark`.

`execution-of-eddard-stark` is the only placement the audit did not propose. Its `location` reads "The Great Sept of Baelor", which is a listed `feature` of `castles/kings-landing`, so King's Landing is unambiguous.

## What was left unplaced, and why

### Rejected from the audit's 48 candidates (5)

The candidate list matches castle names by whole word. It cannot read prepositions, so five matches name a castle as a **bearing or a waypoint** rather than the site.

| Entry                                       | `location`                                                  | Why not                                      |
| ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `battles/battle-of-ice`                     | the frozen lake three days from Winterfell                  | A distance, not a place                      |
| `battles/battle-of-oxcross`                 | Oxcross ... west of the Golden Tooth                        | Oxcross is elsewhere; the Tooth is a bearing |
| `battles/battle-of-the-green-fork`          | The banks of the Green Fork of the Trident, below the Twins | "below" is a bearing                         |
| `battles/daeron-is-conquest-of-dorne`       | The Prince's Pass, the Boneway, and Sunspear                | Three separate sites                         |
| `events/union-of-dorne-and-the-iron-throne` | Dorne and King's Landing                                    | Two separate places                          |

### No castle match (77 at baseline, 81 after)

Structural, not backlog:

- **22 of 53 events are off the map entirely.** 18 are on Essos (Braavos, Meereen, Valyria, Qarth, Vaes Dothrak, Yi Ti) and 4 on the Summer Isles. Atlas space covers Westeros only, so these have nowhere to go until a second space exists.
- **1 battle has no `location` at all** (`stark-wars-of-unification`), and 13 unplaced battles carry no `region` either.
- The rest name a war, a region, a river, a forest, a sea, or a whole continent: "the Red Fork", "the Dornish Marches", "Westeros south of the Neck", "The skies of the world". A point marker would misrepresent them.

## After state

```
PLACEMENT COVERAGE
  castles   146/146  100%
  battles    25/72   35%
  events     19/53   36%

OUT OF BOUNDS (0)
STACKED POINTS (21, 0 with no castle to anchor them)
CLUSTERED WITHIN 5 UNITS (3)
PLACEABLE, UNPLACED (5)
```

All 21 stacks are anchored by a castle, which is the intended shape of "reuse the seat's coordinates". The largest is King's Landing at (590, 830) with 11 entries: the town, 3 battles, and 7 events.

The 3 clustered pairs are unchanged from the baseline; the Red Keep and King's Landing sit 2 units apart because they are two content entries for one city.

## Changes shipped alongside

| File                        | Change                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/schemas.ts`            | `coords: CoordsSchema.optional()` on `BattleSchema` and `EventSchema`; exported `Coords` type                                                                        |
| `lib/map.ts`                | `MAP_BOUNDS`, `MAP_LAYERS`, `isCoords`, `entryCoords`, `isWithinMapBounds`, `placementHref`, `selectPlacements`; `selectVisibleCastles` moved to an object parameter |
| `lib/content-integrity.ts`  | out-of-bounds coordinate check across castles, battles, and events                                                                                                   |
| `components/MapMarker`      | `battle` (filled triangle, `--tkw-deposed`) and `event` (hollow diamond, `--tkw-attainted`) glyphs; href routes by layer                                             |
| `components/MapLayerToggle` | iterates `MAP_LAYERS`, so battles and events get their own checkboxes                                                                                                |
| `components/MapStage`       | viewBox now reads `MAP_BOUNDS` instead of private constants                                                                                                          |

## Follow-ups this work deliberately did not take

1. **Mount a layered map page.** `MapStage` needs a Westeros-only base image at 4:7 (`aspect-ratio: 4 / 7` is already declared in its module). `public/map/` holds only 10000x8300 world rasters and one 7680x7680 square, so the plate has no backdrop. Adding that image is the prerequisite for `/maps` (or a new route) to show the layers.
2. **Re-derive the 146 castle coordinates in natural pixels** so the layers can ride on the existing raster. That is a separate project: it would invalidate every placement made here and needs its own review.
3. **A second coordinate space for Essos**, without which 22 events stay unplaceable.
