# Weapons and Dragons sections

Add two fully-realised top-level sections — **Weapons** and **Dragons** — alongside the existing Houses / Characters / Castles wiki. Each gets its own content collection, schema, list page, and per-entry detail page, following the patterns already in use.

Supersedes `2026-05-29-dragons-and-weapons-stubs-design.md`, which proposed coming-soon stubs and was never implemented. The current `MainMenu.tsx` still ships three tiles (Maps, Timeline, Houses), and the stub design is moot.

## Goals

- A `/weapons/` section catalogues the named blades and ancestral arms of the Seven Kingdoms (including lost or destroyed ones — Ice, Blackfyre, Dark Sister).
- A `/dragons/` section catalogues the known dragons — those bound to a house (Targaryen) and those wild (the Cannibal).
- Existing `ancestral-weapons` references on houses migrate to point at the new collection, so there is one source of truth per weapon.
- Both routes ship populated with a small seed (4 weapons, 7 dragons) but the schemas/loaders/components are designed for incremental population via the `gota-populate-*` skill workflow.

## Out of scope

- Populating every weapon and dragon AWOIAF lists. Subsequent populate-skill PRs handle that incrementally.
- Per-entry maps, family trees, or visualisations beyond the infobox + prose body pattern.
- A timeline of dragon riders / weapon wielders. The chronological `riders` and `wielders` arrays on each entry capture the data; visualising it is a separate concern.

## Content model

Two new collections under `content/`, validated by two new Zod schemas in `lib/schemas.ts`. Both schemas live next to `HouseSchema` / `CharacterSchema` / `CastleSchema` and reuse `DateSchema` / `SourceSchema`.

### `WeaponSchema`

| Field           | Type                                                                                       | Notes                                               |
| --------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `slug`          | `string`                                                                                   | filename slug                                       |
| `name`          | `string`                                                                                   | display name (e.g. `Blackfyre`)                     |
| `type`          | enum: `sword`, `greatsword`, `longsword`, `dagger`, `axe`, `spear`, `bow`, `horn`, `other` |                                                     |
| `material`      | enum: `valyrian-steel`, `dragonglass`, `dragonbone`, `steel`, `other`                      |                                                     |
| `forged`        | `DateSchema` (optional)                                                                    |                                                     |
| `destroyed`     | `DateSchema` (optional)                                                                    | present only when status is `destroyed`             |
| `status`        | enum: `extant`, `lost`, `destroyed`                                                        |                                                     |
| `origin-house`  | `string` (optional)                                                                        | house slug                                          |
| `current-house` | `string \| null`                                                                           | house slug; `null` for lost / destroyed / un-housed |
| `wielders`      | `string[]`                                                                                 | character slugs, chronological                      |
| `aliases`       | `string[]`                                                                                 |                                                     |
| `mentions`      | `string[]`                                                                                 | for `prose-links` (see below)                       |
| `sources`       | `SourceSchema[]`                                                                           |                                                     |
| `draft`         | `boolean` (default `false`)                                                                |                                                     |

### `DragonSchema`

| Field      | Type                                                                  | Notes                                     |
| ---------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `slug`     | `string`                                                              |                                           |
| `name`     | `string`                                                              |                                           |
| `color`    | `string` (optional)                                                   | free-form prose (`"black with red eyes"`) |
| `size`     | enum: `hatchling`, `young`, `mature`, `great`, `monstrous` (optional) |                                           |
| `hatched`  | `DateSchema \| null`                                                  |                                           |
| `died`     | `DateSchema \| null`                                                  |                                           |
| `status`   | enum: `extant`, `dead`, `lost`, `wild`                                |                                           |
| `house`    | `string \| null`                                                      | house slug; `null` for wild dragons       |
| `riders`   | `string[]`                                                            | character slugs, chronological            |
| `aliases`  | `string[]`                                                            |                                           |
| `mentions` | `string[]`                                                            |                                           |
| `sources`  | `SourceSchema[]`                                                      |                                           |
| `draft`    | `boolean` (default `false`)                                           |                                           |

### `HouseSchema` change

The existing `ancestral-weapons` field changes from `z.array(HouseInfoEntrySchema).optional()` to `z.array(z.string()).optional()` — a plain slug list. The per-entry `note` that lived inline (e.g. Blackfyre's "lost with Bittersteel after the Redgrass Field") moves onto the weapon entry itself, where it belongs.

This is a breaking content-frontmatter change: every house with an `ancestral-weapons` entry must migrate in the same commit. Currently that's `targaryen.md` and `blackfyre.md`.

### Loaders

`lib/content.ts` gains the same pair of functions for each collection that the others already have:

```ts
export const loadWeapon = (slug: string) =>
  loadFile<Weapon>("weapons", slug, WeaponSchema);
export const loadDragon = (slug: string) =>
  loadFile<Dragon>("dragons", slug, DragonSchema);
export const loadAllWeapons = () => loadAll<Weapon>("weapons", WeaponSchema);
export const loadAllDragons = () => loadAll<Dragon>("dragons", DragonSchema);
```

## Routes

```
app/weapons/page.tsx                + page.module.scss
app/weapons/[slug]/page.tsx         + page.module.scss
app/dragons/page.tsx                + page.module.scss
app/dragons/[slug]/page.tsx         + page.module.scss
```

Both `[slug]/page.tsx` use `generateStaticParams` so `output: 'export'` still pre-renders every entry.

### `/weapons/` index

```
ParchmentLayout
  h1                "Weapons"
  .subtitle         "Named blades, ancestral arms, and lost relics of the realm."
  FilteredWeaponList
```

### `/weapons/[slug]/` detail

```
ParchmentLayout
  h1                weapon name
  .subtitle         "{Material} {type}, of House {origin-house name}"
                    e.g. "Valyrian steel greatsword, of House Stark"
  WeaponInfobox     (aside, sigil + dl)
  body              markdown rendered through remarkProseLinks
  Sources
```

The subtitle falls back gracefully when fields are missing (e.g. unknown origin-house — `"Valyrian steel longsword"`).

### `/dragons/` index

```
ParchmentLayout
  h1                "Dragons"
  .subtitle         "Of the dragons that were and the dragons that are."
  FilteredDragonList
```

### `/dragons/[slug]/` detail

```
ParchmentLayout
  h1                dragon name
  .subtitle         "Of House Targaryen"  /  "A wild dragon"
  DragonInfobox     (aside, sigil + dl)
  body              markdown rendered through remarkProseLinks
  Sources
```

## Components

### New: `FilteredWeaponList`, `FilteredDragonList`

Both mirror `FilteredHouseList` exactly — debounced search input + paginated A–Z list — and share `components/listSearch.module.scss`. Each row uses the existing region tinting:

- **Weapons:** `<Sigil />` resolved in fallback order `current-house` → `origin-house` → none + weapon name. When neither is set (e.g. an extant weapon belonging to no house), a neutral tint.
- **Dragons:** `<Sigil />` of `house` + dragon name. Wild dragons render no sigil and a neutral / `wild` tint (re-use a `--region-color-*` token, or extend `globals.css` with a single new `--region-color-wild`).

### New: `WeaponInfobox`, `DragonInfobox`

Both follow `HouseInfobox`'s shape — a `<dl>` of `InfoRow`s topped by a `<Sigil />`. They reuse the **affiliated house's sigil** as the visual anchor:

- Weapons: the `origin-house` sigil.
- Dragons: the `house` sigil. Wild dragons render no sigil.

Rows:

| `WeaponInfobox`                                           | `DragonInfobox`                             |
| --------------------------------------------------------- | ------------------------------------------- |
| Type                                                      | Color                                       |
| Material                                                  | Size                                        |
| Forged                                                    | Hatched                                     |
| Destroyed (when applicable)                               | Died                                        |
| Status                                                    | Status                                      |
| Origin house → /houses/<slug>/                            | House → /houses/<slug>/ (or "Wild")         |
| Current house → /houses/<slug>/ (or "Lost" / "Destroyed") | Riders → /characters/<slug>/, chronological |
| Wielders → /characters/<slug>/, chronological             | Aliases                                     |
| Aliases                                                   |                                             |

### Refactor: hoist `InfoRow` / `InfoEntry` out of `HouseInfobox`

Today `HouseInfobox.tsx` defines two unexported components (`InfoRow`, `InfoEntry`) and a helper (`humanizeSlug`). Both new infoboxes need identical primitives. Hoist them into a new module (e.g. `components/Infobox.tsx` or `components/infobox/index.ts`) and re-import from all three infobox files. Existing `HouseInfobox.test.tsx` continues to pin behaviour through the public component.

### Updated: `HouseInfobox`

- Accepts a new prop `weaponsBySlug: Map<string, Weapon>`. The existing "Ancestral weapons" row resolves slugs through this map (linking to `/weapons/<slug>/`) instead of rendering inline `HouseInfoEntry` shapes.
- Gains a new **"Dragons"** row that lists every dragon whose `house === house.slug`, linked to `/dragons/<slug>/`. Computed from a `dragonsForHouse: Dragon[]` prop the page passes in.

### Updated: `app/characters/[slug]/page.tsx`

If the character's slug appears in any weapon's `wielders`, render a **"Bore"** section listing those weapons. If in any dragon's `riders`, a **"Rode"** section. Both link to the respective detail pages.

## Prose auto-linking

`lib/prose-links.ts` extends `ProseLinkTarget['kind']` from `'character' | 'house'` to `'character' | 'house' | 'weapon' | 'dragon'`. `buildProseLinkIndex` gains two more iteration loops (over weapons + dragons), emitting targets with `href: '/weapons/<slug>/'` and `href: '/dragons/<slug>/'`.

The existing `mentions` semantics carry over: a weapon or dragon entry that lists `'targaryen'` in its `mentions` array unlocks bare-name matching for `Targaryen` in its prose body, the same way character pages do.

This means weapon / dragon names auto-link from any prose body (house, character, weapon, dragon) without manual `[Blackfyre](/weapons/blackfyre/)` markup.

## Navigation

### `SiteMenu`

Append two entries to `ITEMS` in `components/SiteMenu.tsx`, after Characters:

```ts
{ href: '/weapons/', label: 'Weapons' },
{ href: '/dragons/', label: 'Dragons' },
```

### `MainMenu`

Grow from 3 tiles to 5 (Maps, Timeline, Houses, Weapons, Dragons — Characters stays in `SiteMenu` only, matching the current treatment).

Two new hand-drawn SVGs in the same style as the existing `COMPASS` / `HOURGLASS` / `SIGIL`:

- `SWORD` — vertical blade point-down, cross-guard, round pommel. Stroke `currentColor` 1.5, optional inner shape at 0.5–0.7 opacity.
- `DRAGON` — three-headed silhouette (echoing the Targaryen sigil's profile) or a single rampant dragon. Final path data chosen during implementation; visual goal is silhouette readability at 32×32.

**Layout** (per the chosen Option A — 3+2 with the bottom row centred):

`MainMenu.module.scss` declares `grid-template-areas` on the parent — never `grid-column: 1 / -1`, per `CLAUDE.md`. On wide breakpoints:

```css
grid-template-columns: repeat(6, 1fr);
grid-template-areas:
  "maps     maps     timeline timeline houses   houses"
  ".        weapons  weapons  dragons  dragons  .";
```

Each top tile spans 2 columns; the bottom two centre by flanking with empty cells. At narrower breakpoints the existing responsive behaviour collapses (e.g. 2-column → 1-column); the named areas are redeclared per breakpoint so every tile reads naturally from the parent rule.

## Cross-linking summary

| From                              | To                                             | Mechanism                    |
| --------------------------------- | ---------------------------------------------- | ---------------------------- |
| House page → weapons              | infobox "Ancestral weapons" row, slug-resolved | `weaponsBySlug` prop         |
| House page → dragons              | infobox "Dragons" row                          | `dragonsForHouse` prop       |
| Character page → weapons          | "Bore" section                                 | reverse lookup in `wielders` |
| Character page → dragons          | "Rode" section                                 | reverse lookup in `riders`   |
| Weapon page → house, characters   | infobox rows                                   | direct slug links            |
| Dragon page → house, characters   | infobox rows                                   | direct slug links            |
| Any prose body → weapons, dragons | inline auto-link                               | `remarkProseLinks` extension |

## Initial content

### `content/weapons/` (4 files)

- `blackfyre.md` — Targaryen origin, Blackfyre cadet branch carried it after 184 AC, `status: lost` (last with Bittersteel after Redgrass Field). Wielders: aegon-i-targaryen → … → daemon-i-blackfyre → aegor-rivers.
- `dark-sister.md` — Targaryen origin, `status: lost` (with Bloodraven beyond the Wall). Wielders: visenya-targaryen → … → brynden-rivers.
- `heartsbane.md` — Tarly, `status: extant`. Wielders chain on the Lord Tarly line.
- `ice.md` — Stark, `status: destroyed` (melted down by Tywin in 299 AC, reforged into Oathkeeper and Widow's Wail). Wielders: rickard-stark → eddard-stark.

The reforged blades (Oathkeeper, Widow's Wail) are deliberately not seeded here; the populate-skill workflow can add them later as their own entries with `forged.year: 299 AC`.

### `content/dragons/` (7 files)

`balerion`, `vhagar`, `meraxes`, `caraxes`, `vermithor`, `sunfyre`, `cannibal`. Together these span Conquest, the Dance of the Dragons, and the wild Dragonstone dragons, exercising both the `house: targaryen` path and the `house: null` (wild) path.

### House file migrations

- `content/houses/targaryen.md` — `ancestral-weapons: [blackfyre, dark-sister]`.
- `content/houses/blackfyre.md` — `ancestral-weapons: [blackfyre]`.
- `content/houses/tarly.md` — add `ancestral-weapons: [heartsbane]`.
- `content/houses/stark.md` — add `ancestral-weapons: [ice]`.

## Testing

Following the co-located convention (`vitest run` via `bun run test`):

- `lib/schemas.test.ts` — add `WeaponSchema` + `DragonSchema` parse cases; update the `HouseSchema` case to assert the new `ancestral-weapons` shape.
- `lib/content.test.ts` — round-trip tests for `loadWeapon`, `loadDragon`, `loadAllWeapons`, `loadAllDragons`.
- `lib/prose-links.test.ts` — assert weapon and dragon targets are indexed; assert prose links resolve for both kinds.
- `components/FilteredWeaponList.test.tsx`, `components/FilteredDragonList.test.tsx` — mirror `FilteredCharacterList.test.tsx`'s coverage (filter, paginate, empty state, wild-dragon row variant).
- `components/WeaponInfobox.test.tsx`, `components/DragonInfobox.test.tsx` — assert each row renders, links resolve, wild-dragon variant suppresses the sigil + house row.
- `components/HouseInfobox.test.tsx` — update for slug-resolved weapons row + new dragons row.
- `components/MainMenu.test.tsx` — assert five tiles, the two new ones link to `/weapons/` and `/dragons/`, layout uses the new `grid-template-areas`.
- `components/SiteMenu.test.tsx` — assert the two new menu items appear with correct hrefs.

Verification gates:

- `bun run test` — full vitest run.
- `bun run build` — confirms `output: 'export'` still pre-renders every new `/weapons/[slug]/index.html` and `/dragons/[slug]/index.html`. (The repo's `pre-push` hook runs this anyway.)

## Commits

Per the `tkw-git-commit-and-pr-format` skill, one logical change per commit, each `TKW:`-prefixed:

1. Add `WeaponSchema` + `DragonSchema`; change `HouseSchema['ancestral-weapons']` to slug list; migrate the four affected house files.
2. Add weapon + dragon content loaders (`loadWeapon` / `loadDragon` / `loadAllWeapons` / `loadAllDragons`).
3. Hoist `InfoRow` / `InfoEntry` out of `HouseInfobox` into a shared module.
4. Add `WeaponInfobox` + `/weapons/[slug]/` route.
5. Add `DragonInfobox` + `/dragons/[slug]/` route.
6. Add `FilteredWeaponList` + `/weapons/` index.
7. Add `FilteredDragonList` + `/dragons/` index.
8. Wire weapons + dragons into `MainMenu` (5 tiles, `grid-template-areas`) and `SiteMenu`.
9. Extend `prose-links` to weapons + dragons.
10. Add Dragons row to `HouseInfobox`; surface borne/ridden on character pages.
11. Seed `content/weapons/{blackfyre,dark-sister,heartsbane,ice}.md`.
12. Seed `content/dragons/{balerion,vhagar,meraxes,caraxes,vermithor,sunfyre,cannibal}.md`.

## Acceptance

- `bun run test` and `bun run build` both succeed.
- `out/weapons/index.html`, `out/dragons/index.html`, and every per-slug `out/weapons/<slug>/index.html` and `out/dragons/<slug>/index.html` are emitted.
- The home page shows five tiles; clicking Weapons / Dragons lands on a parchment list with seeded entries.
- House detail pages for Targaryen, Blackfyre, Tarly, and Stark show their ancestral weapons as links to `/weapons/<slug>/`.
- The Targaryen house detail page shows a "Dragons" row listing the seeded Targaryen dragons.
- Character detail pages for known wielders/riders show "Bore" / "Rode" sections.
- Prose mentions of `Blackfyre`, `Vhagar`, etc. auto-link from any rendered markdown body that doesn't suppress them.
