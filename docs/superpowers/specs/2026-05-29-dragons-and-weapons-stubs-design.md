# Dragons + Ancestral Weapons section stubs

Stub two new top-level sections (**Dragons** and **Ancestral Weapons**) so they appear in the main menu alongside Maps, Timeline, Encyclopedia, and Houses. Both ship as coming-soon pages, matching how Maps / Timeline / Encyclopedia are stubbed today.

## Scope

In scope:

- New static routes: `/dragons/` and `/weapons/`.
- Two new `MainMenuTile`s with `status="coming-soon"`, appended after Houses.
- Inline SVG glyphs for both tiles, in the same style as the existing four.
- Test coverage extension if `components/MainMenu.test.tsx` exists.

Out of scope (deliberately deferred):

- Zod schemas (`Dragon`, `Weapon`).
- Content directories under `content/`.
- Index / list / detail pages.
- Any cross-linking from House or Character pages.

## Routes

Both mirror `app/encyclopedia/page.tsx`:

- `app/dragons/page.tsx`: `metadata.title = 'Dragons · Atlas of the Known World'`, renders `<ParchmentLayout><ComingSoonPage title="Dragons" /></ParchmentLayout>`.
- `app/weapons/page.tsx`: `metadata.title = 'Ancestral Weapons · Atlas of the Known World'`, renders `<ParchmentLayout><ComingSoonPage title="Ancestral Weapons" /></ParchmentLayout>`.

The URL for ancestral weapons is `/weapons/` (shorter); the menu title remains the full phrase.

## Main menu

Append two tiles to `components/MainMenu.tsx`, after the existing Houses tile, in this order:

| Title | Subtitle | Href | Glyph |
| --- | --- | --- | --- |
| Dragons | `Wake the dragon.` | `/dragons/` | Dragon-wing silhouette |
| Ancestral Weapons | `Lift the blades of legend.` | `/weapons/` | Sword, point-down, simple cross-guard |

Both pass `status="coming-soon"`. Final tile order:

1. Maps (coming-soon)
2. Timeline (coming-soon)
3. Encyclopedia (coming-soon)
4. Houses (live)
5. Dragons (coming-soon)
6. Ancestral Weapons (coming-soon)

## Glyphs

Add two new const SVGs at the top of `components/MainMenu.tsx`, following the convention used by `COMPASS`, `HOURGLASS`, `BOOK`, and `SIGIL`:

- `viewBox="0 0 32 32"`, `width="32"`, `height="32"`, `aria-hidden="true"`.
- Strokes use `currentColor` with `strokeWidth="1.5"`.
- Optional inner shape filled at `0.5` to `0.7` opacity.

Working shapes:

- **DRAGON**: an outlined wing arc with a small flame or eye accent inside.
- **SWORD**: a vertical blade (point down) with a horizontal cross-guard and a round pommel.

Exact path data finalized in implementation; visual goal is a silhouette that reads at 32×32 in the same engraved style as the existing four.

## Tests

If `components/MainMenu.test.tsx` exists today, extend it to assert the two new tiles render with their titles, hrefs, and the coming-soon pill. If no test exists, no new test file is required for this stub (it would be added when the sections become real).

## Acceptance

- `bun run build` succeeds; `/dragons/index.html` and `/weapons/index.html` are emitted under `out/`.
- `bun test` passes.
- Home page shows six tiles in the order above; the two new ones display the coming-soon pill.
- Direct navigation to `/dragons/` and `/weapons/` renders the parchment coming-soon page.
