# The Known World — design system conventions

A Game-of-Thrones "atlas" design system: aged-parchment surfaces, sepia ink, gold-leaf ornament, and a serif type scale (Cinzel display, EB Garamond body). Every component is the real, compiled app component exposed on `window.TKW`.

## Setup: no provider, but the stylesheet is the whole look

There is **no provider or theme wrapper**. Components style themselves through a single global stylesheet (`styles.css` and its `@import` closure) that defines the design tokens, loads the four brand fonts, and paints the parchment background on `body`. As long as that stylesheet is loaded, components render on-brand. Do not wrap the app in anything; just render the components.

The four fonts (Cinzel, Cormorant Unicase, EB Garamond, Alegreya Sans) load via a font-host `@import` at the top of the bundled CSS. Headings default to Cinzel small-caps; body copy to EB Garamond.

## Styling idiom: compose components, style glue with `var(--*)` tokens

This is a **CSS-custom-property token system**, not a utility-class or prop-styling system. Components carry their own (scoped, hashed) CSS-module classes internally — you neither see nor set those class names. For **your own** layout glue and any bespoke element, reach for the design tokens below with `var(--token)`; never invent class names and never hard-code the hex values (they change with the palette).

Color tokens: `--parchment-light`, `--parchment-dark`, `--vellum` (surfaces); `--ink`, `--ink-faded`, `--ink-slate`, `--ink-rose` (text); `--gold-leaf` (ornament/accents, e.g. filigree), `--wax-seal` (deep red), `--rose-madder`. Regional heraldic tints: `--region-color-north`, `--region-color-vale`, `--region-color-riverlands`, `--region-color-westerlands`, `--region-color-reach`, `--region-color-stormlands`, `--region-color-dorne`, `--region-color-iron-islands`, `--region-color-crownlands`.

Font tokens: `--font-heading` (Cinzel display), `--font-body` / `--font-ui` (EB Garamond), `--font-character-name` (Cormorant Unicase), `--font-sans` (Alegreya Sans). Breakpoints are exposed as `--bp-xs … --bp-xl`.

The global stylesheet also styles bare `h1`–`h3`, `p`, `a`, and a `.subtitle` italic lede as typographic primitives — plain heading/paragraph markup already looks right; you rarely need to restyle it.

## Where the truth lives

- The bound `styles.css` and its `@import` closure — the authoritative token/font/component-CSS source. Read it before styling.
- Each component's `<Name>.prompt.md` (usage + examples) and `<Name>.d.ts` (`<Name>Props` — the API contract). Compose from these; the props are real.

## Composition patterns worth knowing

- **Infoboxes** (`HouseInfobox`, `BattleInfobox`, `DragonInfobox`, `WeaponInfobox`) take a domain object plus lookup `Map`s (`housesBySlug`, `charactersBySlug`, …). Empty `Map`s are fine — names simply render unlinked. `InfoRow` / `InfoEntry` are the building blocks (a labeled `<dt>/<dd>` row, and a single list item).
- **Toggles/search** (`SortToggle`, `ViewToggle`, `MapLayerToggle`, `CharacterSearchInput`, `Accordion`) are **controlled** — you own the value/state and pass a change handler.
- **Ornament**: `FiligreeRule` (a divider) and `FiligreeFlourish` inherit their gold color from `currentColor`; set `color: var(--gold-leaf)`. `PageHeading` already pairs an `h1` with a `FiligreeRule`.

## One idiomatic snippet

```jsx
const { PageHeading, HouseInfobox } = window.TKW;

function HousePage() {
  const empty = new Map();
  return (
    <main
      style={{
        display: "grid",
        gap: "var(--bp-xs)",
        padding: "2rem",
        fontFamily: "var(--font-body)",
        color: "var(--ink)",
      }}
    >
      <PageHeading title="House Stark" subtitle="Winter Is Coming" />
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

Note: house/sigil crest images resolve from a `/sigils` path the DS render environment does not serve, so `Sigil` (and the crest atop the infoboxes) shows an empty frame here — the surrounding structure and text are faithful.
