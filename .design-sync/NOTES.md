# design-sync notes — the-known-world (TKW)

Repo-specific gotchas for syncing this repo to claude.ai/design. Read before every re-sync.

## Shape: package, via a custom pre-build

the-known-world is a **Next.js app**, not a component library with a shipped `dist/`. There is no compiled entry and no shipped stylesheet — components are styled entirely with **SCSS modules** compiled by Next at build time. So the stock converter cannot bundle it directly.

`.design-sync/build/build-dist.mjs` bridges the gap. It esbuild-compiles `components/` into a framework-free dist the converter consumes verbatim:

- `dist/tkw.js` — one ESM module re-exporting every component. `react`, `react-dom`, and `react/jsx-runtime` are **external** (the converter's IIFE pass maps them to `window.React`). SCSS modules are compiled to scoped class-name strings.
- `dist/tkw.css` — the compiled component module CSS (esbuild `local-css` output).
- `dist/ds-styles.css` — the `cssEntry`: remote font `@import` (must stay first line), font-family vars, compiled `styles/globals.scss` tokens, then component CSS.

`cfg.buildCmd` runs this before the converter. It needs its own esbuild (staged in `.design-sync/build/node_modules`) and the repo's `sass`. On a fresh clone: `cd .design-sync/build && npm i` before the first sync.

## Framework substitutions (faithfulness caveats)

Components are the repo's REAL code, compiled. The only substitutions are primitives the DS render env can't provide (all inside `build-dist.mjs`):

- `next/link` → plain `<a href>`.
- `next/image` → plain `<img>` (honors `fill` via absolute+object-fit; drops `loader`/`priority`/`sizes`). Image `src` values like `/sigils/*.png` are **public assets not served in the DS env** — they render as broken/empty images. Affects `Sigil`, list cards, `SiteMenu`. Root-absolute `url()` refs in SCSS (only `/patterns/floral-pattern.avif`) ARE inlined as data URIs from `public/`.
- `next/navigation` → inert `useRouter`/`usePathname`/`useSearchParams` etc.
- `nuqs` → inert `useQueryState`/`useQueryStates`/parsers returning defaults; `NuqsAdapter` passthrough. If a new nuqs parser is imported, add it to the `NUQS` stub in `build-dist.mjs` (esbuild fails loudly on a missing named export).

## Component list is config-pinned

No `.d.ts` exists (no build emits types), so the card list can't come from shipped types. `cfg.componentSrcMap` **pins every card** (name → src path) and excludes internals (icons, contexts, providers, skeletons) with `null`. 39 cards; ~9 exports excluded. When components are added/removed, update `componentSrcMap`.

## Fonts

The 3 brand families (Cormorant Garamond, Spectral, JetBrains Mono) are set by `next/font/google` at runtime in the app. In the DS they're defined as `--font-*` vars + loaded via a remote `@import` from Google Fonts (first line of `ds-styles.css`). Expect a `[FONT_REMOTE]` (informational) from validate — not a failure.

## Grouping

39 cards are grouped via stub docs in `.design-sync/docs/<Name>.md` (`category:` frontmatter only). Groups: Heraldry, Decorative, Typography, Infoboxes, Controls, Navigation, Layout, Map, Lists, Timeline, Family Tree.

## Preview scope

Presentational components get authored previews (`.design-sync/previews/`). The heavy feature components — WorldMap, MapStage, the Filtered\* lists, FamilyTree\*, Timeline\* — are **data/route-driven** and ship as **floor cards** by design (importable, no rich preview). Authorable on any later re-sync.

## Known render warns

- **`[RENDER_THIN] FiligreeFlourish`** — benign. FiligreeFlourish is a thin decorative gold vine (a horizontal SVG flourish with no text), so the render check measures little paint. Confirmed rendering correctly in the review sheet; not a defect. A re-sync seeing this warn should treat it as expected.
- `TimelineCluster` is excluded as a card (`componentSrcMap: null`) — it is provider-coupled (needs `TimelineClusterProvider`) and its floor card rendered near-blank. Still importable from the bundle; just not shown as a card.

## Re-sync risks (what can silently go stale)

- **Font @import ordering**: `ds-styles.css` must keep the Google Fonts `@import` as its literal first line, or all four families silently fall back to Georgia/serif. `build-dist.mjs` guarantees this; a hand-edit could break it. Self-hosting the woff2 (dropping the remote dependency) is a future improvement.
- **Public-asset images**: any component whose visual depends on `/sigils`, `/map`, `/menu-icons`, etc. renders with broken images in the DS env. This is expected, not a regression.
- **nuqs/next stub drift**: if the app adopts new `next/*` or `nuqs` API surface, the stubs in `build-dist.mjs` must follow, or the dist build fails.
- **componentSrcMap drift**: new components won't appear until added to `componentSrcMap`; renamed/removed ones must be pruned there.
- **Weak prop contracts**: with no `.d.ts`, `<Name>Props` comes from `cfg.dtsPropsFor` (hand-transcribed for the scoped set). Unlisted components get empty props. Keep `dtsPropsFor` in sync with source prop changes.
- **`globalName` is pinned to `TKW`** — designs reference `window.TKW.*`. Changing it orphans every design built against the old name.
