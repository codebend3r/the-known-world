# Character field spec — `content/characters/<slug>.md`

Schema: `CharacterSchema` in `lib/schemas.ts`. Renderer: `app/characters/[slug]/page.tsx`.

## Full or placeholder

Entries come in two shapes, and picking wrong ships a broken family tree.

| Use a **placeholder** when…                                                                                  | Use a **full character** when…                                              |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Canon names them only by relation ("Lady Bracken", "Tully bastard daughter") → `placeholder-reason: unnamed` | The character is named and has biographical content on AWOIAF               |
| Mentioned in passing with nothing to write → `placeholder-reason: unwritten`                                 | The character has a dedicated AWOIAF article with at least a few paragraphs |
| May not have existed — legendary, conflicting sources → `placeholder-reason: uncertain`                      |                                                                             |

Placeholders exist only to make the family tree wire up. They are filtered out of `generateStaticParams` and render solely as greyed-out, non-linked nodes inside other characters' family panels. **If you are writing a prose body and titles, it is not a placeholder** — drop `placeholder` and `placeholder-reason`.

## What to pull from AWOIAF

Fetch `https://awoiaf.westeros.org/index.php/<Name_With_Underscores>` — disambiguated articles use parens, e.g. `.../Lord_Bracken_(Hand_of_the_King)`. Read the infobox plus the lede:

- **Sex** — `m` / `f`, or `null` only when AWOIAF genuinely doesn't specify (rare, usually `unknown` ancestors)
- **Born / died** — year, era, precision, or `null`
- **Primary house** — birth house slug; `null` for hedge knights, smallfolk, the unaffiliated
- **Also of houses** — women who married in and hold both identities (Cersei: `lannister` primary + `baratheon` also-of), or bastards legitimized into another house. Fosterage does **not** count.
- **Parents / spouses / children** — slugs of other character files
- **Titles** — `Lord of Winterfell`, `Hand of the King`, `Queen of the Seven Kingdoms`
- **Aliases** — bynames (`The Unworthy`, `The Imp`, `The Mountain That Rides`). The first alias renders parenthetically after the name in the page heading.

## Canonical frontmatter order

```yaml
---
slug: eddard-stark
name: Eddard Stark
sex: m
born:
  year: 263
  era: AC
  precision: year
died:
  year: 299
  era: AC
  precision: year
primary-house: stark
also-of-houses: # omit the key entirely if empty
  - tully
parents: # omit if empty
  - rickard-stark
  - lyarra-stark
spouses: # omit if empty
  - catelyn-stark
children: # omit if empty
  - robb-stark
  - sansa-stark
titles: # omit if empty
  - Lord of Winterfell
  - Warden of the North
  - Hand of the King
aliases: # omit if empty
  - The Quiet Wolf
placeholder: true # ONLY for placeholders
placeholder-reason: unnamed # ONLY for placeholders
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Eddard_Stark
    license: CC-BY-SA-3.0
draft: false
---
```

`born` / `died` use the shared date shape documented in `SKILL.md`. Unknown means the whole key is `null` — never `year: 0`, and there is no `precision: unknown`.

## Wiring the family graph

The most error-prone step. Slugs in `parents`, `spouses`, `children` must either point at a `content/characters/<slug>.md` that **exists**, or at a placeholder you create in the same change. A dangling slug passes the schema but renders as raw kebab-case text in the family panel.

**Conventional slug shapes** — look at existing files before inventing:

| Pattern                        | Example                                                   | When                                |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------- |
| `firstname-lastname`           | `eddard-stark`, `cersei-lannister`                        | Standard named character            |
| `firstname-roman-lastname`     | `aegon-iv-targaryen`, `daeron-ii-targaryen`               | Numbered monarchs                   |
| `lord-house-disambiguator`     | `lord-bracken-hand-of-aegon-iv`                           | Unnamed lord, disambiguated by role |
| `lady-house-wife-of-firstname` | `lady-bracken-wife-of-jonos`                              | Unnamed wife                        |
| `firstname-son-of-firstname`   | `aegon-son-of-rhaegar`, `aemon-blackfyre-son-of-daemon-i` | Sons disambiguated by father        |
| `unknown-house-ancestors`      | `unknown-baratheon-ancestors`                             | Collective placeholder              |

Short slugs collide — `cersei-lannister`, never `cersei`.

**Reciprocity:** if you add `children: [robb-stark]` to Eddard, `robb-stark.md` should already list Eddard in `parents`. Verify with a quick grep. `lib/family-tree.ts` reads from both sides, but mismatches are wasteful drift. Reciprocal edits to other characters ship in their own commit unless they're required to render this one at all.

## Body length by tier

| Tier                        | Example                                            | Length                                                    |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Placeholder                 | `lady-bracken-wife-of-jonos.md`, `ryam-florent.md` | Empty, or 1–2 sentences of context                        |
| Minor / footnote            | `aegon-iv-targaryen.md`                            | 1 short paragraph, 3–5 sentences                          |
| Bannerman / supporting lord | `lord-bracken-hand-of-aegon-iv.md`                 | 1 paragraph, 5–8 sentences                                |
| POV / great-house figure    | `eddard-stark.md`, `robert-baratheon.md`           | 2 paragraphs — early life, then AGOT-era posture and fate |
| Tentpole / chapter-driving  | `joffrey-baratheon.md`                             | 3 paragraphs — pre-AGOT, AGOT–ACOK, ASOS resolution       |

Refer to characters by name on first mention, by relation thereafter ("Lord Eddard", "the boy king"). For deaths within canon, name where and how, and the year if known — don't omit it.

## Worked example — placeholder

```yaml
---
slug: lady-bracken-wife-of-jonos
name: Lady Bracken
sex: f
born: null
died: null
primary-house: bracken
also-of-houses: []
spouses:
  - jonos-bracken
children:
  - catelyn-bracken
  - bess-bracken
  - alysanne-bracken
placeholder: true
placeholder-reason: unnamed
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Lady_Bracken
    license: CC-BY-SA-3.0
draft: false
---
```

No body. Placeholders still keep their `sources:` block.

## Worked example — full character

```yaml
---
slug: robert-baratheon
name: Robert Baratheon
sex: m
born:
  year: 262
  era: AC
  precision: year
died:
  year: 298
  era: AC
  precision: year
primary-house: baratheon
parents:
  - steffon-baratheon
  - cassana-estermont
spouses:
  - cersei-lannister
children:
  - joffrey-baratheon
  - myrcella-baratheon
  - tommen-baratheon
  - mya-stone
  - gendry
  - edric-storm
titles:
  - King of the Andals and the First Men
  - Lord of the Seven Kingdoms
  - Protector of the Realm
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Robert_Baratheon
    license: CC-BY-SA-3.0
draft: false
---
First of his name, King of the Seven Kingdoms after toppling the Targaryen dynasty at the Trident. Wed Cersei Lannister to seal Tywin's loyalty after the war. Killed by a boar in the Kingswood at the dawn of *A Game of Thrones*.
```

## Character-specific traps

| Thought                                                    | Reality                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| "`placeholder: true` plus a 3-paragraph body"              | Contradiction. Prose means it's a full character.                          |
| "I'll link `children` to `unknown-stark-child-1`"          | Use real slugs that exist or that you create in the same change.           |
| "`also-of-houses: [stark]` for Robert — he was Ned's ward" | No. Marriage-in or legitimization only. Fosterage doesn't count.           |
| "A bastard needs a house to look tidy"                     | `primary-house: null` is fine. Trees follow canon, not aesthetics.         |
| "Placeholders don't need `sources:`"                       | They do. See `lady-bracken-wife-of-jonos.md`.                              |
| "I'll add AWOIAF plus a second wiki link to be thorough"   | One AWOIAF source is the convention.                                       |
| "I'll skip the body for Eddard and just do frontmatter"    | POV-tier characters get 2–3 paragraphs. Empty bodies are for placeholders. |
