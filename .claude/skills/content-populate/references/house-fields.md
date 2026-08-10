# House field spec — `content/houses/<slug>.md`

Schema: `HouseSchema` in `lib/schemas.ts`. Renderer: `components/HouseInfobox.tsx`.

## What a stub looks like

```yaml
---
slug: crakehall
name: House Crakehall
seat: ""
liege: null
words: ""
sigil:
  description: ""
founded:
  year: 0
  era: age-of-heroes
  precision: legendary
status: extant
sworn-from: []
cadet-houses: []
region: westerlands
sources: []
draft: false
---
```

Empty `seat`, `words`, `sigil.description` and `year: 0` are the stub markers.

## What to pull from AWOIAF

Fetch `https://awoiaf.westeros.org/index.php/House_<Name>` and read the infobox plus the lede:

- **Coat of arms / sigil** — short field-of-X, charge-Y phrasing
- **Words** — the motto, or none recorded
- **Seat(s)** — primary holdfast, plus former or secondary seats
- **Liege** — the overlord house, or none for great / sovereign lines
- **Founded** — year, era, precision
- **Status** — `extant` / `extinct` / `exiled` / `hidden`
- **Region** — one of the nine (see `lib/regions.ts`)
- **Heads** — current head(s) at the time of _A Game of Thrones_
- **Titles** — formal styles held by the head
- **Ancestral weapons** — Valyrian steel blades and the like
- **Cadet branches** — junior houses sprung from this line

## Required core

```yaml
seat: <castle-slug> # content/castles/<slug>.md
liege: <house-slug-or-null> # null only for great / sovereign houses
words: "Ours is the Fury" # double-quoted; "" if none recorded
sigil:
  description: A crowned black stag on a golden field
```

**`region` must be one of the nine enum slugs:** `north`, `vale`, `riverlands`, `westerlands`, `reach`, `stormlands`, `dorne`, `iron-islands`, `crownlands`. Not `The Iron Islands` — that display label belongs in a `regions:` info-entry, if anywhere.

**Sigil voice:** charge first, field last, no leading "A field of…", no trailing period. Match the existing entries:

- `A grey direwolf running on a snow-white field` (stark)
- `A pink flayed man, hung head-down, on a dark red field` (bolton)
- `A crowned black stag on a golden field` (baratheon)

`founded` uses the shared date shape documented in `SKILL.md`.

## Optional info arrays

These are `HouseInfoEntry[]` — each entry is `{ name, slug?, note? }`. **Omit the whole key** when there's nothing to say. Only populate when the array adds information beyond what the renderer already derives.

| Array                | When to add                                                                                                                       | What goes in                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `seats:`             | Multiple seats, OR the seat needs a `note` ("formerly"), OR the primary `seat` has no castle file so a name override helps render | Each holdfast: `name`, `slug` if a castle file exists, optional `note`                                              |
| `heads:`             | A known head at _A Game of Thrones_ time                                                                                          | Style + name as `"Lord Roose Bolton"`; `slug` only if `content/characters/<slug>.md` exists and isn't a placeholder |
| `regions:`           | House holds influence in more than one region, OR the region needs a `note` like "formerly"                                       | Display names (`The Reach`, `Stormlands`, `Slaver's Bay`) — labels, not region-enum slugs                           |
| `titles:`            | Any formal title beyond "Lord of X" worth listing                                                                                 | `Lord of Storm's End`, `Warden of the North`, `Voice of Oldtown`                                                    |
| `ancestral-weapons:` | Named Valyrian steel or legendary blade                                                                                           | `Ice`, `Heartsbane`, `Blackfyre`, `Dark Sister`                                                                     |

**Don't invent a `seats:` array just to repeat the single `seat:` field.** `HouseInfobox.tsx` falls back to the `seat` castle's name automatically.

**Don't add a `slug:` under `heads:` for a character file that doesn't exist.** Name without slug renders fine; a dead slug leaks raw text.

## Body length

- **Paragraph 1** — founding, lineage, ancient deeds. Trace the line to a named founder where possible.
- **Paragraph 2** — defining acts or character of the house through the centuries.
- **Paragraph 3 (optional)** — state of the house at _A Game of Thrones_: current lord, holdings, posture.

Great houses get three paragraphs, matching the cadence of `stark.md`. Lesser and Crakehall-tier houses get **two**, matching `bolton.md`. Five paragraphs is never the answer.

## Worked example — `baratheon.md`

```yaml
---
slug: baratheon
name: House Baratheon
seat: storms-end
liege: null
words: "Ours is the Fury"
sigil:
  description: A crowned black stag on a golden field
founded:
  year: 1
  era: AC
  precision: year
status: extant
sworn-from: []
cadet-houses: []
region: stormlands
seats:
  - name: Storm's End
    slug: storms-end
heads:
  - name: "King Robert I Baratheon"
    slug: robert-baratheon
regions:
  - name: Stormlands
  - name: Crownlands
titles:
  - name: Lord of Storm's End
  - name: Lord Paramount of the Stormlands
  - name: King of the Andals, the Rhoynar, and the First Men
  - name: Lord of the Seven Kingdoms
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/House_Baratheon
    license: CC-BY-SA-3.0
draft: false
---
House Baratheon of Storm's End is one of the Great Houses of Westeros …
```

## Reference entries to match

`baratheon.md`, `hightower.md`, `targaryen.md`, `stark.md`, `bolton.md`.
