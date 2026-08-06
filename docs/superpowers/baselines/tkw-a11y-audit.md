# tkw-a11y-audit baseline

First run of `.claude/skills/tkw-a11y-audit/audit-a11y.ts` against `main`, and the sweep that followed it.

Scope: 63 non-test `.tsx` files under `app/` and `components/`, plus the 55 ink/ground token pairs declared in `styles/globals.scss`.

## Before

12 markup findings across 8 classes, 6 contrast pairs below AA.

| Class                     | Count | Where                                                               |
| ------------------------- | ----- | ------------------------------------------------------------------- |
| `svg-image-unnamed`       | 3     | `FamilyTreeChart:231`, `MapStage:58`, `WorldMap:253`                |
| `alt-duplicates-heading`  | 2     | `app/battles/[slug]/page.tsx:78`, `app/weapons/[slug]/page.tsx:127` |
| `svg-unnamed`             | 2     | `MapStage:57`, `WorldMap:252`                                       |
| `viewport-zoom-locked`    | 1     | `app/layout.tsx:34`                                                 |
| `svg-img-prunes-links`    | 1     | `FamilyTreeChart:540`                                               |
| `static-interaction`      | 1     | `FamilyTreeChart:540`                                               |
| `combobox-dangling-popup` | 1     | `SearchCombobox:110`                                                |
| `listbox-unnamed`         | 1     | `SearchCombobox:110`                                                |

Classes that ran clean on the first pass, which is a result in its own right:

- `control-no-name` — **zero**. Every icon-only button in `SortToggle`, `ViewToggle`, `WorldMap`, and `FamilyTreeChart` already carried an `aria-label`, and every toggle group already had `role="group"` plus a name. The brief expected work here; there was none.
- `heading-no-h1` / `heading-many-h1` / `heading-skip` — **zero** across all 18 routes, resolved through the components each route renders (`PageHeading` gives h1, `Accordion headingLevel={2}` gives h2, `FamilyTreeViews` gives h2 two levels down).
- `img-no-alt`, `img-alt-noise`, `click-no-key`, `role-not-focusable`, `noninteractive-tabindex`, `canvas-not-operable`, `combobox-incomplete`, `option-incomplete` — zero.

### The three that mattered

**1. `FamilyTreeChart` was an image containing links.** The `<svg>` shipped `role="img" aria-label="Family tree chart"`. `role="img"` prunes its subtree from the accessibility tree, so every person node, each an `<a href="/characters/…">`, was invisible to assistive tech. The chart also had `onPointerDown`/`onPointerMove`/`onPointerUp` and no key handler, no `tabIndex`, and no focus ring: drag-only, unreachable from the keyboard.

**2. Two SVG canvases were unnamed and their raster backdrops were unhidden.** `WorldMap`'s inner `<svg>` and `MapStage`'s both drew a full-bleed `<image>` with no name, announced as a nameless graphic on top of an unnamed container.

**3. `SearchCombobox` pointed `aria-controls` at nothing.** The listbox renders behind `{showList && (…)}`, but `aria-controls={listboxId}` was unconditional, so the IDREF dangled the whole time the field was closed. The listbox itself had no accessible name.

### Contrast

| Ratio  | Pair                                      | Verdict         |
| ------ | ----------------------------------------- | --------------- |
| 2.58:1 | `--tkw-ink-dim` on `--tkw-surface-raised` | fails all AA    |
| 2.96:1 | `--tkw-ink-dim` on `--tkw-surface-solid`  | fails all AA    |
| 2.99:1 | `--tkw-ink-dim` on `--tkw-surface`        | fails all AA    |
| 3.18:1 | `--tkw-ink-dim` on `--tkw-bg`             | large text only |
| 3.32:1 | `--tkw-ink-dim` on `--tkw-bg-deep`        | large text only |
| 3.95:1 | `--tkw-extinct` on `--tkw-surface-raised` | large text only |

## Fixed

| File                                                         | Change                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/FamilyTreeChart/FamilyTreeChart.tsx`             | `role="img"` to `role="application"`; added `tabIndex={0}`, `aria-keyshortcuts`, and an `onKeyDown` (arrows pan a fifth of the box, `+`/`=`/`-` zoom, `0` resets); node portraits `aria-hidden="true"`                        |
| `components/FamilyTreeChart/FamilyTreeChart.module.scss`     | `.svg:focus-visible` gold ring, inset so it does not double the container hairline                                                                                                                                            |
| `components/WorldMap/WorldMap.tsx`                           | inner `<svg>` gets `role="group"` + `aria-label`; map `<image>` `aria-hidden`; stage gets `aria-keyshortcuts`                                                                                                                 |
| `components/MapStage/MapStage.tsx`                           | stage becomes `role="application"` + `aria-label` + `tabIndex={0}` + `onKeyDown` driving the viewer's own `pan`/`zoomOnViewerCenter`/`fitToViewer`; `<svg>` `role="group"`; backdrop `aria-hidden`; new optional `label` prop |
| `components/MapStage/MapStage.module.scss`                   | `.inner:focus-visible` ring                                                                                                                                                                                                   |
| `components/SearchCombobox/SearchCombobox.tsx`               | `aria-controls` emitted only while open; listbox named `"<field> results"`; added a `role="status"` live region with the result count                                                                                         |
| `components/SearchCombobox/SearchCombobox.module.scss`       | `.status` visually-hidden via `clip-path: inset(50%)`, kept in the layout so it stays announced                                                                                                                               |
| `app/layout.tsx`                                             | dropped `maximumScale: 1` and `userScalable: false` from `viewport` (WCAG 1.4.4)                                                                                                                                              |
| `app/battles/[slug]/page.tsx`, `app/weapons/[slug]/page.tsx` | `alt={fm.name}` to `alt={\`Depiction of ${fm.name}\`}`, so the figure stops repeating the `<h1>`                                                                                                                              |
| `components/Filigree/Filigree.tsx`                           | `focusable="false"` on both flourish SVGs, matching every other decorative icon                                                                                                                                               |

Both consumers of the combobox, `CharacterSearchInput` (autocomplete mode) and `HouseSearchInput`, inherit the fix; neither needed its own change.

### Tests added

All in co-located files, so a regression fails `bun run test`:

| File                                                  | Asserts                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/FamilyTreeChart/FamilyTreeChart.test.tsx` | canvas is a named focusable `application`; never `role="img"` while links are present; arrow keys pan; `+` zooms and `0` restores; portraits hidden behind the node `<title>`              |
| `components/WorldMap/WorldMap.test.tsx`               | stage named with shortcuts advertised; drawing is a named `group`, not an `img`; raster hidden while the King's Landing link stays exposed                                                 |
| `components/MapStage/MapStage.test.tsx`               | named focusable application surface; named `group`; hidden backdrop                                                                                                                        |
| `components/SearchCombobox/SearchCombobox.test.tsx`   | no `aria-controls` while closed; it resolves to the live listbox when open; listbox named; `aria-activedescendant` resolves to the `aria-selected` option; live region announces the count |
| `app/layout.test.ts`                                  | `viewport` leaves pinch zoom unlocked                                                                                                                                                      |

## Deliberately left

| Item                                                                | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 6 contrast failures                                             | Every one is `--tkw-ink-dim` (5 of 6) or `--tkw-extinct` on the raised surface. Fixing them means editing design tokens in `styles/globals.scss`, which has 40-plus consumers and is a design decision, not an ARIA one. Smallest change that clears AA text on all five grounds: raise `--tkw-ink-dim` from `#6b6350` to roughly `#8a8271`. `--tkw-ink-dim` is used for empty states, placeholders, and the "Unfurling the map…" hint, all of which are body text, so this is a real defect, not a technicality. |
| No skip link (WCAG 2.4.1)                                           | `SiteHeader` puts 8 nav links plus the menu trigger ahead of `<main>` on every route, and `PlateLayout`'s `<main>` has no id to target. Adding one is new markup and new SCSS in a shared layout component, outside an ARIA-and-keyboard sweep. Flagged in `SKILL.md` under "what the audit cannot see".                                                                                                                                                                                                          |
| `SiteMenu`'s backdrop `div` with `onClick`                          | `aria-hidden="true"`, so it is not in the accessibility tree at all and there is no keyboard path to add. The drawer already closes on Escape and has a real Close button. The audit exempts always-hidden elements from `static-interaction` for this reason.                                                                                                                                                                                                                                                    |
| `role="option"` with `onMouseDown`/`onMouseEnter` and no `tabIndex` | The APG combobox pattern keeps focus on the input and moves `aria-activedescendant`. Adding `tabIndex` would break it. The audit exempts activedescendant-managed roles.                                                                                                                                                                                                                                                                                                                                          |
| The two `alt` fixes have no unit test                               | `app/**/page.tsx` are async server components loading markdown; the repo has no harness for them. The `alt-duplicates-heading` class in the audit script is the regression guard.                                                                                                                                                                                                                                                                                                                                 |
| `MapStage` keyboard handling is untested end to end                 | Its existing test mocks `ReactSVGPanZoom` as a function component, which cannot hold a ref. The markup contract is tested; the identical imperative pan/zoom path is covered on `WorldMap`, whose mock is a class. `MapStage` is also not mounted by any route today.                                                                                                                                                                                                                                             |
| The seven disabled `jsx-a11y` rules stay off                        | Turning them on fires against the two sanctioned patterns above as well as the real defects. The audit script encodes the exemptions; the lint rules cannot.                                                                                                                                                                                                                                                                                                                                                      |

## After

```
A11Y AUDIT · 63 files · 0 findings

  no findings
CONTRAST · 55 token pairs · 6 below AA text (4.5:1)
  2.58:1  --tkw-ink-dim on --tkw-surface-raised  (fails all AA)
  2.96:1  --tkw-ink-dim on --tkw-surface-solid  (fails all AA)
  2.99:1  --tkw-ink-dim on --tkw-surface  (fails all AA)
  3.18:1  --tkw-ink-dim on --tkw-bg  (large text only)
  3.32:1  --tkw-ink-dim on --tkw-bg-deep  (large text only)
  3.95:1  --tkw-extinct on --tkw-surface-raised  (large text only)
```

Every markup class is clean. The script still exits `1` because of the contrast rows, which is correct: they are open findings with a named owner, not noise to suppress.
