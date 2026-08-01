# The Known World: design system conventions

Iron Throne v1, a Game-of-Thrones "atlas" design system: a forge-black ground, a single molten-gold accent, and heraldic house colour used strictly as data. Type is Cormorant Garamond for display, Spectral for body, JetBrains Mono for every label and datum. Every component is the real, compiled app component exposed on `window.TKW`.

## Setup: no provider, but the stylesheet is the whole look

There is **no provider or theme wrapper**. Components style themselves through a single global stylesheet (`styles.css` and its `@import` closure) that defines the design tokens, loads the three brand fonts, and paints the forge-black ground plus its four atmosphere layers on `body`. As long as that stylesheet is loaded, components render on-brand. Do not wrap the app in anything; just render the components.

The three fonts (Cormorant Garamond, Spectral, JetBrains Mono) load via a font-host `@import` at the top of the bundled CSS. Titles default to Cormorant Garamond 600; body copy to Spectral 300; anything countable, dated, or categorical to uppercase, letter-spaced JetBrains Mono.

## Styling idiom: compose components, style glue with `var(--*)` tokens

This is a **CSS-custom-property token system**, not a utility-class or prop-styling system. Components carry their own (scoped, hashed) CSS-module classes internally; you neither see nor set those class names. For **your own** layout glue and any bespoke element, reach for the design tokens below with `var(--token)`; never invent class names and never hard-code the hex values (they change with the palette).

Ground and surface: `--tkw-bg` (page ground), `--tkw-bg-deep` (code blocks, map wells, page edges), `--tkw-surface` (cards, infoboxes, chips, search fields), `--tkw-surface-solid`, `--tkw-surface-raised` (a plate nested inside an already-surfaced panel).

Accent metal: `--tkw-gold` is the one interface accent; `--tkw-gold-bright` is the wordmark, the active nav item, and every hover. Borders are `--tkw-hairline` at rest, `--tkw-hairline-firm` on denser surfaces, `--tkw-hairline-faint` on separator rules. `--tkw-glow` is the hover drop-glow and `--tkw-lift` is the transition that pairs with it.

Type ramp: `--tkw-ink` (titles, primary text), `--tkw-ink-body` (article copy), `--tkw-ink-muted` (blurbs, secondary values, inactive nav), `--tkw-ink-dim` (field labels, counts, plate numbers).

Status: `--tkw-extant`, `--tkw-deposed`, `--tkw-contested`, `--tkw-attainted`, `--tkw-extinct`. A status pill is mono 9px at `letter-spacing: 1.2px`, `padding: 4px 9px`, `border-radius: 3px`, coloured with the status token on that hue at 16% alpha behind a 45% border.

Heraldic colour: `--house-stark`, `--house-targaryen`, `--house-lannister`, `--house-baratheon`, `--house-tully`, `--house-tyrell`, `--house-arryn`, `--house-martell`, `--house-greyjoy`, `--house-bolton`, plus the regional tints `--region-color-north`, `--region-color-vale`, `--region-color-riverlands`, `--region-color-westerlands`, `--region-color-reach`, `--region-color-stormlands`, `--region-color-dorne`, `--region-color-iron-islands`, `--region-color-crownlands`. These identify a banner, shield, swatch, or map pin. They never theme a page.

Font tokens: `--font-display` (Cormorant Garamond), `--font-body` (Spectral), `--font-mono` (JetBrains Mono). Type scale: `--fs-display`, `--fs-h1`, `--fs-h2`, `--fs-section`, `--fs-body`, `--fs-quote`, `--fs-label`, with `--lh-display` / `--lh-title` / `--lh-body` and the letter-spacing steps `--ls-eyebrow`, `--ls-section`, `--ls-caption`, `--ls-nav`, `--ls-label`.

Geometry: `--tkw-measure` (1240px page measure), `--tkw-measure-wide`, `--tkw-gutter` (56px), `--tkw-radius`, and the two clip-paths `--tkw-shield` (fixed-height shields) and `--tkw-banner` (variable-height banners). Breakpoints are exposed as `--bp-xs … --bp-xl`.

The global stylesheet also styles bare `h1`–`h3`, `p`, `a`, and a `.subtitle` italic gold lede as typographic primitives. `h3` is the mono section heading, so plain heading and paragraph markup already looks right; you rarely need to restyle it.

## The six structural rules

1. **One gold, many house colours.** Gold is the only interface accent. House colour appears only where it identifies something.
2. **Atmosphere, never wallpaper.** Background layers sit at 3.5 to 5% opacity behind a vignette, painted once on `body`, never competing with type.
3. **Mono means data.** Anything countable, dated, or categorical is uppercase mono with letter-spacing. Anything narrative is Spectral.
4. **Hairline, then glow.** Rest is a 1px `--tkw-hairline`. Hover promotes it to solid `--tkw-gold` and adds `--tkw-glow`. No transforms, no scale.
5. **Every page is a plate.** Eyebrow label, display title, rule, then content, inside the measure and its gutter, with a mono colophon below.
6. **Shields are the motif.** `--tkw-shield` repeats at every scale, from a 14px swatch to a 154px hero banner.

## Where the truth lives

- The bound `styles.css` and its `@import` closure: the authoritative token/font/component-CSS source. Read it before styling.
- `app/design/page.tsx` in the repo renders the same catalogue as a live page.
- Each component's `<Name>.prompt.md` (usage + examples) and `<Name>.d.ts` (`<Name>Props`, the API contract). Compose from these; the props are real.

## Composition patterns worth knowing

- **Layout**: `PlateLayout` is the page plate. It owns the 1240px measure and the 56px gutter; its children stretch to it and are left-aligned. (It was called `ParchmentLayout` before Iron Throne v1.)
- **Infoboxes** (`HouseInfobox`, `BattleInfobox`, `DragonInfobox`, `WeaponInfobox`) take a domain object plus lookup `Map`s (`housesBySlug`, `charactersBySlug`, …). Empty `Map`s are fine; names simply render unlinked. Each opens with a gold caption bar naming the entry. `InfoRow` / `InfoEntry` are the building blocks (a labelled `<dt>/<dd>` row, and a single list item).
- **Toggles/search** (`SortToggle`, `ViewToggle`, `MapLayerToggle`, `CharacterSearchInput`, `Accordion`) are **controlled**; you own the value/state and pass a change handler. They all follow the chip rules: unselected is `--tkw-surface` on `--tkw-hairline-firm`, selected inverts to solid `--tkw-gold` with `--tkw-bg` text.
- **Ornament**: `FiligreeRule` (a divider) and `FiligreeFlourish` inherit their gold from `currentColor`; set `color: var(--tkw-gold)`. `PageHeading` already pairs an optional mono eyebrow, an `h1`, an optional lede, and a `FiligreeRule`.

## One idiomatic snippet

```jsx
const { PageHeading, HouseInfobox } = window.TKW;

function HousePage() {
  const empty = new Map();
  return (
    <main
      style={{
        display: "grid",
        gap: "26px",
        maxWidth: "var(--tkw-measure)",
        margin: "0 auto",
        padding: "26px var(--tkw-gutter) 60px",
        fontFamily: "var(--font-body)",
        color: "var(--tkw-ink-body)",
      }}
    >
      <PageHeading
        eyebrow="Collection 03"
        title="House Stark"
        subtitle="Winter Is Coming"
      />
      <HouseInfobox
        house={{
          slug: "stark",
          name: "House Stark",
          seat: "winterfell",
          liege: null,
          words: "Winter Is Coming",
          sigil: {
            description: "A grey direwolf on a white field",
            provenance: "canon",
          },
          rank: "royal",
          founded: { year: 0, era: "age-of-heroes", precision: "era" },
          status: "extant",
          titles: [{ name: "Warden of the North" }],
          "cadet-houses": [],
          sources: [],
        }}
        castlesBySlug={empty}
        charactersBySlug={empty}
        housesBySlug={empty}
        weaponsBySlug={empty}
        dragonsForHouse={[]}
      />
    </main>
  );
}
```

Note: house/sigil crest images resolve from a `/sigils` path the DS render environment does not serve, so `Sigil` (and the banner atop the house infobox) shows an empty shield frame here; the surrounding structure and text are faithful.
