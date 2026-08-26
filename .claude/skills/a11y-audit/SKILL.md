---
name: a11y-audit
description: Use when accessibility is the subject in this repo. Triggers include "is this accessible", "run an a11y audit", "check WCAG", "screen reader", "keyboard navigation", "can you Tab to the map", "the family tree needs keyboard support", "add aria labels", "is the alt text right", "check colour contrast", "the focus ring is missing", "add a role to this SVG", "fix the combobox ARIA", "why is jsx-a11y not catching this", or before shipping a new interactive component, a chart, or an icon-only control.
---

# A11y Audit

## Overview

`.oxlintrc.json` loads the `jsx-a11y` plugin and then switches **six of its rules off**:

```
click-events-have-key-events            no-noninteractive-element-to-interactive-role
no-noninteractive-element-interactions  no-noninteractive-tabindex
no-static-element-interactions          prefer-tag-over-role
```

Not deferred work. Oxlint does not treat `role="application"` as interactive and has no role allowlist, so those rules flag the pan/zoom canvases and the ARIA combobox popup this site is built on. Turning them on would mean changing correct markup to satisfy the tool. `docs/tooling-rule-mapping.md` records the reason per rule.

CI is green on `bun lint:ts` and always will be. **The lint config is not the gate; it is the reason a gate is needed.**

This directory is that gate, in four files:

| file            | what it holds                                                                  |
| --------------- | ------------------------------------------------------------------------------ |
| `audit-a11y.ts` | the CLI: walks the roots, runs the checks, prints or emits JSON                |
| `jsx-source.ts` | the JSX reader — masks comments and strings, builds an ancestor-aware tag tree |
| `checks.ts`     | the rules: images, SVG, interactions, combobox, headings, viewport             |
| `contrast.ts`   | ink/ground token pairs from `styles/globals.scss`                              |

**It is read-only. It fixes nothing.**

The three interactive surfaces it exists for:

| Surface                | Files                                                          | Why a linter cannot see it                                             |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| World map pan and zoom | `WorldMap`, `MapStage`, `MapMarker`                            | `react-svg-pan-zoom` owns the transform; keys are hand-wired           |
| Family tree chart      | `FamilyTreeChart`                                              | The whole body is parked in a `useMemo`, textually outside the `<svg>` |
| Jump-to-entry search   | `SearchCombobox` + `CharacterSearchInput` + `HouseSearchInput` | ARIA IDREFs resolve at render time, not at parse time                  |

## Running it

```bash
bun .claude/skills/a11y-audit/audit-a11y.ts
bun .claude/skills/a11y-audit/audit-a11y.ts --json
```

Run from the repo root. It reads every non-test `.tsx` under `app/` and `components/` (63 files today) plus `styles/globals.scss`, takes well under a second, and exits `1` when there is anything to report.

## The finding classes

| Code                                   | What it means here                                                                       | Fix                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `img-no-alt`                           | `<Image>`/`<img>` with no `alt` at all                                                   | Describe the art, or `alt=""` if it is decoration             |
| `img-alt-redundant`                    | Non-empty `alt` inside an always-`aria-hidden` wrapper, so it is never read              | `alt=""`                                                      |
| `alt-duplicates-heading`               | `alt` expression is byte-identical to the route's `<h1>`                                 | Say what the picture shows: `Depiction of ${fm.name}`         |
| `img-alt-noise`                        | `alt` opens with "image of" / "photo of"                                                 | Drop the prefix; the role already says it is an image         |
| `svg-unnamed`                          | `<svg>` with no role and no `aria-hidden` ancestor                                       | Pick a pattern from the table below                           |
| `svg-role-unnamed`                     | `role="img"`/`group`/`application` with no `aria-label`, `aria-labelledby`, or `<title>` | Add one                                                       |
| `svg-img-prunes-links`                 | `role="img"` on an `<svg>` that draws `<a>` elements                                     | `role="group"`, or `role="application"` if it also takes keys |
| `svg-image-unnamed`                    | SVG `<image>` with no name and no `aria-hidden`                                          | Raster backdrops take `aria-hidden="true"`                    |
| `static-interaction`                   | `onClick`/`onPointerDown` on a `div`, `span`, `li`, or `svg` with no interactive role    | `<button>`, or the canvas pattern                             |
| `click-no-key`                         | `onClick` with no `onKeyDown` on a non-interactive host                                  | WCAG 2.1.1; add the key handler or use a real control         |
| `canvas-not-operable`                  | `role="application"` with no key handler; it swallows every keystroke and does nothing   | Add `onKeyDown`                                               |
| `role-not-focusable`                   | An interactive role on a host Tab cannot reach                                           | `tabIndex={0}`                                                |
| `noninteractive-tabindex`              | `tabIndex` with no role: an unnamed stop in the tab order                                | Remove it, or give the element a role and a name              |
| `control-no-name`                      | `<button>`/`<a href>` whose only content is `aria-hidden`                                | `aria-label`, or unhidden text                                |
| `combobox-incomplete`                  | `role="combobox"` missing `aria-expanded` or `aria-controls`                             | Both are mandatory in ARIA 1.2                                |
| `combobox-dangling-popup`              | `aria-controls` points at an element behind a `&&` guard                                 | Emit `aria-controls` only while the popup is open             |
| `listbox-unnamed`                      | `role="listbox"` with no name                                                            | `aria-label={\`${ariaLabel} results\`}`                       |
| `option-incomplete`                    | `role="option"` with no `aria-selected` or no `id`                                       | Both; the `id` is what `aria-activedescendant` points at      |
| `heading-no-h1` / `-many-h1` / `-skip` | Per route, resolved through the components it renders                                    | Change the level, not the styling                             |
| `viewport-zoom-locked`                 | `maximumScale` or `userScalable: false` in a `viewport` export                           | Delete them; WCAG 1.4.4 wants 200%                            |

Contrast is reported separately, as a matrix of 11 foreground tokens against 5 grounds (55 pairs), with translucent surfaces composited over `--tkw-bg` first. AA is 4.5:1 for body text, 3:1 for large text and UI boundaries.

## The three ARIA patterns this repo uses

### SVG, four cases and no fifth

| Case                                 | Markup                                                                            | Example                                   |
| ------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Icon inside an already-named control | `aria-hidden` + `focusable="false"` on the `<svg>`                                | `SortToggle`, `ViewToggle/icons`          |
| Decorative flourish                  | `aria-hidden="true"` on the wrapping `<span>`, `focusable="false"` on the `<svg>` | `Filigree`, `SectionGlyphs`               |
| Standalone meaningful graphic        | `role="img"` + `<title>` or `aria-label`                                          | none today                                |
| Interactive canvas                   | see below                                                                         | `WorldMap`, `MapStage`, `FamilyTreeChart` |

**`role="img"` prunes everything inside it.** That is the single trap on this codebase. `FamilyTreeChart` shipped `role="img"` on an `<svg>` whose every person is an `<a>` to a character page: the label read fine and not one of those links existed for a screen reader. If a graphic contains a link, it is not an image.

### The canvas pattern

Any pan-and-zoom surface gets all five, together:

```tsx
<svg
  role="application"
  aria-label="Family tree chart"
  aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - 0"
  tabIndex={0}
  onKeyDown={onKeyDown}
>
```

with a `:focus-visible` ring in the module and `<image aria-hidden="true">` for the raster beneath. `role="application"` tells assistive tech to stop intercepting keys and hand them straight to the element, so shipping it without an `onKeyDown` is worse than shipping no role at all: the user loses their own arrow keys and gains nothing. The three canvases answer the same keys (arrows pan a fifth of the box, `+`/`=`/`-` zoom, `0` resets), because a user who learns one has learned all three.

### The combobox

`SearchCombobox` is the only one, and both `CharacterSearchInput` (autocomplete mode) and `HouseSearchInput` render through it, so fixing it once fixes both.

| Element               | Required                                                                       |
| --------------------- | ------------------------------------------------------------------------------ |
| `<input>`             | `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-label`   |
| `<input>` when open   | `aria-controls={listboxId}`, `aria-activedescendant` on the highlighted option |
| `<ul role="listbox">` | `id`, `aria-label`                                                             |
| `<li role="option">`  | `id` matching `aria-activedescendant`, `aria-selected`                         |
| live region           | `role="status"` + `aria-live="polite"` with the result count                   |

**Emit `aria-controls` only while the popup exists.** The listbox is behind `{showList && (…)}`, so a constant `aria-controls` dangles for the entire time the field is closed, which is most of its life. Options are never focused: the input keeps focus and `aria-activedescendant` moves. That is why `role="option"` is exempt from the `tabIndex` checks, and why the count needs its own live region.

### Toggle groups

`SortToggle`, `ViewToggle`, and the `WorldMap` control clusters all use `<div role="group" aria-label="…">` wrapping `<button type="button" aria-label="…" aria-pressed={…}>`. Icon-only buttons carry the name; the `<svg>` inside is `aria-hidden`. This was already correct across all 44 components: the `control-no-name` class found zero hits on the first run. Do not "improve" these into `radiogroup`; `aria-pressed` on a toolbar of toggle buttons is a sanctioned APG pattern and every existing test asserts against the current names.

## What the audit cannot see

Report these as review questions, never as clean:

- **Runtime focus order.** Nothing here mounts a DOM. `SiteMenu`'s focus trap and `FamilyTreeChart`'s fullscreen mode are correctness-by-reading.
- **Which contrast pair is actually painted.** The matrix is every plausible pair, not the pairs a given rule uses. Grep the module before acting on one.
- **Live-region timing**, announcement text, and anything a real screen reader would do.
- **JSX behind two levels of indirection.** The parser follows `{name}` into a `const name = useMemo(…)` in the same file (which is what makes `FamilyTreeChart` legible to it) but not into another module.
- **Bypass blocks (WCAG 2.4.1).** There is no skip link. `SiteHeader` puts 8 nav links plus the menu trigger ahead of `<main>` on every route. Adding one is markup, not ARIA, so it needs its own change.

## Quick Reference

```bash
# audit
bun .claude/skills/a11y-audit/audit-a11y.ts
bun .claude/skills/a11y-audit/audit-a11y.ts --json | jq '.counts'

# what CI runs; the a11y contracts are asserted in co-located tests
bun run check
bun test --isolate components/FamilyTreeChart components/WorldMap components/SearchCombobox

# the seven disabled rules, straight from the config
jq '.rules | with_entries(select(.key | startswith("jsx-a11y")))' .oxlintrc.json

# surfaces worth eyeballing after any change
grep -rln "onClick\|onKeyDown" components --include="*.tsx" | grep -v test
grep -rn "role=" components app --include="*.tsx" | grep -v test
```

Baseline run and what it changed: `docs/superpowers/baselines/a11y-audit.md`.

## Common mistakes

| Mistake                                                          | Why it goes wrong                                                                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trusting `bun lint:ts` as the a11y gate                          | Six `jsx-a11y` rules are off, and they are the six this codebase needs.                                                                             |
| Putting `role="img"` on an interactive SVG                       | It prunes the subtree. Every link, label, and title inside disappears.                                                                              |
| Adding `role="application"` without `onKeyDown`                  | It stops assistive tech handling keys and puts nothing in their place. Strictly worse than no role.                                                 |
| Turning the disabled lint rules back on to "fix" this            | They fire on the sanctioned patterns too (`role="option"` without `tabIndex`, the `aria-hidden` backdrop). Noise, not signal.                       |
| Fixing contrast by editing `styles/globals.scss`                 | Tokens are a design decision with 40-plus consumers. Report the ratio and the smallest token change; let the user pick.                             |
| Assuming `aria-hidden` on a wrapper makes the child's `alt` moot | Only when the wrapper is unconditionally hidden. `aria-hidden={decorative \|\| undefined}` is not, and `Sigil` relies on that.                      |
| Reading `FamilyTreeChart`'s `<svg>` and seeing an empty canvas   | Its whole body is a `useMemo` declared above the return. Grep for `bodyMemo`, not for children.                                                     |
| Adding a second `aria-label` inside a labelled canvas            | The stage already names it. A nested label just makes the announcement longer.                                                                      |
| Testing a canvas through `MapStage`'s existing mock              | `ReactSVGPanZoom` is mocked there as a function component, so it holds no ref. Imperative pan/zoom is covered on `WorldMap`, whose mock is a class. |

## Related skills

- `image-optimize`: the same `public/` assets, sized rather than described
- `seo-metadata`: the other half of what a crawler and a screen reader share, `lang`, headings, and landmarks
