# Battles content type

## Goal

Introduce a `battles` content type so the atlas can catalogue the wars, battles, sieges, and campaigns of the Known World. Scaffold an initial corpus (~72 entries) spanning the Dawn Age through the events of A Dance with Dragons, each with a start and end date.

## Scope

In scope:

- A new `BattleSchema` in `lib/schemas.ts`.
- Loader wiring in `lib/content.ts` (`loadBattle`, `loadAllBattles`, `"battles"` type).
- One `content/battles/<slug>.md` file per battle/war bullet, scaffolded as a draft.
- A validation test asserting every battle file parses against `BattleSchema`.

Out of scope (deferred):

- Battles index and detail pages. `/battles/` stays the coming-soon stub.
- Full prose bodies. Scaffolds carry a 1 to 2 sentence summary only.
- Cross-linking battles into house/character pages.

## Schema

New `BattleSchema`, reusing the existing `DateSchema`, `SourceSchema`, and `ParticipantSchema`.

| Field          | Type                         | Notes                                                                                                         |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `slug`         | string                       | kebab-case, matches filename                                                                                  |
| `name`         | string                       | display name                                                                                                  |
| `type`         | enum                         | `battle`, `siege`, `war`, `campaign`, `raid`, `naval`, `massacre`, `rebellion`, `mutiny`, `skirmish`, `other` |
| `war`          | string, optional             | grouping conflict, e.g. "The Dance of the Dragons"                                                            |
| `start`        | DateSchema                   | `{ year, era, precision }`                                                                                    |
| `end`          | DateSchema                   | same shape; equals `start` for single-day battles                                                             |
| `location`     | string, optional             | free text (also covers Essos)                                                                                 |
| `region`       | enum(REGION_SLUGS), optional | set only for Westerosi battles                                                                                |
| `participants` | ParticipantSchema[]          | `{ side, houses[] }`, default `[]`                                                                            |
| `commanders`   | string[]                     | character slugs, default `[]`                                                                                 |
| `victor`       | string, optional             | winning side label                                                                                            |
| `outcome`      | string, optional             | short result                                                                                                  |
| `casualties`   | string[]                     | default `[]`                                                                                                  |
| `aliases`      | string[]                     | default `[]`                                                                                                  |
| `mentions`     | string[]                     | default `[]`                                                                                                  |
| `sources`      | SourceSchema[]               | default `[]`                                                                                                  |
| `draft`        | boolean                      | default `false`; scaffolds set `true`                                                                         |

### Approximate dates

Approximation is carried by the existing `DateSchema.precision` field, not a separate flag:

- `exact` renders with no asterisk.
- `year`, `decade`, `era`, `legendary` are approximate and render with a trailing asterisk.

Legendary Dawn Age and Age of Heroes battles use large BC years with `precision: legendary` or `era`. Historical battles with firm dates use `precision: exact` (or `year` where only the year is known).

## Loader

`lib/content.ts` gains `"battles"` in the type union used by `loadFile`/`loadAll`, plus:

```ts
export const loadBattle = (slug: string) =>
  loadFile<Battle>("battles", slug, BattleSchema);
export const loadAllBattles = () => loadAll<Battle>("battles", BattleSchema);
```

`loadAll` already returns `[]` when the directory is absent, so nothing else changes.

## Content corpus

One file per bullet from the source list, grouped by the `war` field derived from the era headers. Wars and campaigns (e.g. "the five Ghiscari Wars") become a single ranged entry; single engagements (e.g. Field of Fire) get one date. Every file is `draft: true` with a short summary body. Slugs are kebab-case of the battle name.

Eras covered: Dawn Age and the Long Night, Age of Heroes, the Andal Invasion, the ancient wars of Essos, Aegon's Conquest, the First Dornish War, Maegor and the Faith Militant Uprising, the Dance of the Dragons, the Conquest and loss of Dorne, the Blackfyre Rebellions, Robert's Rebellion, the Greyjoy Rebellion, the War of the Five Kings, the war beyond and at the Wall, the ironborn in the Reach, Slaver's Bay, and the unresolved Northern campaign.

## Testing

A test co-located in `lib/` loads every `content/battles/*.md` and asserts it parses against `BattleSchema`, plus a sanity check that `end` is not chronologically before `start` where both are `exact`. Run `bun run typecheck`, `bun run lint`, and `bun run test`.
