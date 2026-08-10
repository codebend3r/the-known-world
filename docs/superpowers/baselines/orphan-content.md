# Orphan Content: Baseline Run

**Date:** 2026-08-05
**Skill:** `.claude/skills/orphan-content`
**Command:** `bun .claude/skills/orphan-content/audit-orphans.ts`

The first inbound-reference sweep of `content/`. `lib/content-integrity.ts` already fails CI on a reference that resolves to nothing; nothing checked the other direction, so an entry that nobody points at passed every gate and shipped as a page with no way in.

## Before

Measured on `main` at `d11fcfd`.

| Collection | Entries   | Orphans | Prose-only | Mentions-only |
| ---------- | --------- | ------- | ---------- | ------------- |
| battles    | 72        | 72      | 0          | 0             |
| castles    | 146       | 36      | 0          | 1             |
| characters | 920       | 16      | 25         | 0             |
| dragons    | 7         | 1       | 0          | 0             |
| events     | 53        | 53      | 0          | 0             |
| houses     | 468       | 273     | 21         | 0             |
| weapons    | 30        | 3       | 0          | 0             |
| **total**  | **1,696** | **454** | **46**     | **1**         |

Reciprocal asymmetries: **51**. Collections with no index route or no nav entry: **2**.

## Asymmetries found (51)

All three checked relations are character kinship, the only genuinely symmetric relation in the corpus.

| Rule                   | Count | Example                                                                             |
| ---------------------- | ----- | ----------------------------------------------------------------------------------- |
| `parents` / `children` | 19    | `danwell-frey.parents` named `walder-frey`, whose `children` held only `emmon-frey` |
| `children` / `parents` | 11    | `hoster-tully.children` named `catelyn-stark`, who had no `parents` at all          |
| `spouses` / `spouses`  | 21    | `sansa-stark.spouses` named `tyrion-lannister`, whose `spouses` was empty           |

The cost was one-sided rendering: Catelyn Stark's page showed no father while Hoster Tully's showed her as a daughter, and `buildFamilyTree` walks `parents`, so half these edges were missing from the trees too.

Two relations that look reciprocal were checked by hand and deliberately left out of the gate:

- **`houses.seat` versus `castles.liege-house`.** 22 mismatches, and every one is a former or extinct holder of a seat the castle now attributes to someone else. Five houses (Strong, Lothston, Towers, Harroway, Qoherys) name `harrenhal` as their seat while the castle names House Whent. One-to-many on purpose.
- **`houses.ancestral-weapons` versus `weapons.origin-house`/`current-house`.** 32 weapon-to-house edges have no listing on the house side, because `ancestral-weapons` is a curated subset. Robert's warhammer and Widow's Wail are Baratheon and Lannister weapons; neither is ancestral.

## What was wired, and on what evidence

Every reference added is asserted somewhere in the corpus already. Nothing was inferred from plausibility, and no AWOIAF lookup was needed: each fix had an in-repo source.

| Fix                                                                             | Count | Evidence                                                                                            |
| ------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| Completed the reciprocal kinship field                                          | 51    | The declaring side already asserts the relationship; only the other side had to agree.              |
| Corrected `houses.seat` / `seats[].slug` that resolved to nothing               | 9     | The slug normalizes to a castle that names the same house in `liege-house`. Mutual.                 |
| Attached `slug` to a `seats[]` entry that had only `name`                       | 18    | The castle name is already written out and the castle exists with that house as `liege-house`.      |
| Attached `slug` to a `heads[]` / `notable-members[]` entry that had only `name` | 61    | Honorific-stripped name matches exactly one character whose `primary-house` is that house.          |
| Added `lamentation` to `houses/royce.ancestral-weapons`                         | 1     | The weapon's `origin-house` is `royce` and its body calls it the sword of House Royce of Runestone. |
| Removed a duplicate entry                                                       | 1     | See below.                                                                                          |

### Seat slugs that resolved to nothing (9)

Eight houses named their seat with a definite article the castle slug does not carry. Both sides were broken: `HouseInfobox` fell back to `humanizeSlug(seat)` and rendered plain text, and the castle had nothing pointing at it.

| House        | Was                 | Now          |
| ------------ | ------------------- | ------------ |
| `arryn`      | `the-eyrie`         | `eyrie`      |
| `bolton`     | `the-dreadfort`     | `dreadfort`  |
| `frey`       | `the-twins`         | `twins`      |
| `hightower`  | `the-hightower`     | `hightower`  |
| `jordayne`   | `the-tor`           | `tor`        |
| `ryswell`    | `the-rills`         | `rills`      |
| `stokeworth` | `castle-stokeworth` | `stokeworth` |
| `westerling` | `the-crag`          | `crag`       |

`hightower` carried the same bad slug twice, in `seat` and in `seats[0].slug`.

Seven other houses still name a seat that does not resolve (`targaryen`: `aegonfort`, `great-pyramid`; `osgrey`: `standfast`, `coldmoat`; `grafton`: `gulltown`; `serry`: `southshield`; `manderly`: `white-harbor`). Those castles do not exist in `content/castles/` at all, so there is nothing to point at. Left as is.

### Names without slugs (79)

The largest and cheapest class. A `seats[]`, `heads[]` or `notable-members[]` entry with a `name` and no `slug` renders as plain text: the house names a real person or castle and links nowhere, and the target counts as an orphan. `InfoRow` and the notable-members list both gate on the slug resolving.

515 member entries carry no slug. Matching was deliberately strict, on the honorific-stripped name **and** `primary-house` or `also-of-houses`, which matched 61 uniquely. One entry matched two characters (`frey.heads` "Lord Walder Frey" resolves to both `walder-frey` and `red-walder-frey`) and was left alone. The remaining 453 name people with no entry in `content/characters/`, which is writing backlog rather than drift.

### The duplicate

`characters/jason-lannister` and `characters/jason-lannister-dance` are the same man: same name, same 90 AC birth, same 130 AC death, same `primary-house`, same parents, same wife, same AWOIAF source URL. `jason-lannister-dance` carries the richer children list and is the one every family reference already points at. `jason-lannister` had **zero** inbound references, which is exactly why the audit surfaced it and why nothing else ever did.

Completing its three asymmetries would have rendered the same man twice as Loreon Lannister's father, twice as Johanna Westerling's husband and twice as Tymond Lannister's son. `content/characters/jason-lannister.md` was removed instead. Nothing referenced it, so no reference had to be repointed.

A second suspected duplicate, `rhaena-targaryen` and `rhaena-targaryen-daughter-of-daemon` (both born 116 AC, both aliased "Rhaena of Pentos", same source URL), was **not** touched: both have inbound references, so consolidating them is an editorial merge rather than an orphan removal.

## What was left orphaned, and why

| Left orphaned | Count | Why                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| battles       | 72    | `buildProseLinkIndex` has no battle target kind and no schema field points at a battle, so **no body in the repo can link to one**. Reachable only through `/battles/` and the timeline. Architectural, not content.                                                                                                                                                                                                  |
| events        | 53    | Same, plus no `/events/` index route and no `NAV_ITEMS` entry. Being fixed separately; reported here so it cannot silently return.                                                                                                                                                                                                                                                                                    |
| houses        | 273   | No character, castle, weapon or dragon attached yet. Writing backlog; `content-triage` owns it.                                                                                                                                                                                                                                                                                                                       |
| castles       | 24    | 12 are abandoned Night's Watch castles along the Wall, which are not anybody's seat. The rest are towns and ruins with no `liege-house` (`kings-landing`, `stoney-sept`, `queenscrown`, `ghaston-grey`) or castles whose house already has a resolving seat (`new-castle`, `high-tide`, `bloody-gate`, `gates-of-the-moon`, `moat-cailin`). Adding a second seat to those houses is an editorial claim, not a repair. |
| characters    | 14    | 10 are pre-Conquest Kings of Winter. See below.                                                                                                                                                                                                                                                                                                                                                                       |
| weapons       | 2     | `catspaw-dagger` has no house and no recorded wielder in the corpus; `the-just-maid` belonged to Ser Galladon of Morne, who has no entry.                                                                                                                                                                                                                                                                             |
| dragons       | 1     | `cannibal` is a wild dragon with no rider and no house. Nothing to attach it to.                                                                                                                                                                                                                                                                                                                                      |

### The Kings of Winter

The single largest cluster, and the clearest illustration of what this audit is for. House Stark marks **29** members `exclude-from-tree: true`, almost all pre-Conquest Kings of Winter, so `buildFamilyTree` skips them. House Stark also has no `heads` and no `notable-members`, so its page renders the tree and nothing else. Result: 10 fully written entries with a correct `primary-house` and no way in, plus 7 more reachable only because House Stark's body happens to spell their name.

```
benjen-the-sweet   brandon-ix-stark  dorren-stark    edderion-the-bridegroom
edwyn-the-spring-king  eyron-stark   harlon-stark    jonos-stark
jorah-stark        walton-the-moon-king
```

Not wired. Every available remedy is an editorial decision rather than a repair:

- `notable-members` would **suppress the Stark family tree**, since the house page renders one or the other.
- A partial `heads` list of just the 10 orphans would be an arbitrary slice of 26 King-titled Starks.
- Clearing `exclude-from-tree` would put 29 disconnected single-node roots into the tree, which is what the flag exists to prevent.

The real fix is a "Kings of Winter" section on the house page, or a complete curated `heads` roll. Both are out of scope for a reference-wiring change.

## After

| Collection | Entries   | Orphans | Prose-only | Mentions-only |
| ---------- | --------- | ------- | ---------- | ------------- |
| battles    | 72        | 72      | 0          | 0             |
| castles    | 146       | **24**  | 0          | **0**         |
| characters | **919**   | **14**  | **23**     | 0             |
| dragons    | 7         | 1       | 0          | 0             |
| events     | 53        | 53      | 0          | 0             |
| houses     | 468       | 273     | 21         | 0             |
| weapons    | 30        | **2**   | 0          | 0             |
| **total**  | **1,695** | **439** | **44**     | **0**         |

Reciprocal asymmetries: **0**.

Excluding battles and events, which no body can link to, orphans fell from **329 to 314**, and every one of the remaining is accounted for above.

## Verification

| Command                               | Result                                              |
| ------------------------------------- | --------------------------------------------------- |
| `bun install --frozen-lockfile`       | 207 packages installed                              |
| `bun format` / `bun run format:check` | all 2,070 matched files already correctly formatted |
| `bun run typecheck`                   | exit 0                                              |
| `bun run lint:ts`                     | exit 0                                              |
| `bun run lint:css`                    | exit 0                                              |
| `bun run test`                        | 652 pass, 0 fail, 1,177 assertions across 67 files  |
| `bun run build`                       | **not verified locally.** See below.                |

The local build was attempted once and abandoned rather than retried. Nine agents were building this repo concurrently at a load average around 156, and the build failed with 60-second per-page timeouts on arbitrary house routes (`/houses/chyttering`, `/houses/clegane`, `/houses/norrey`, and so on) with no error traceable to this diff. Build verification is deferred to CI, which runs uncontended on the branch. No green build is claimed here.

Note that the checks above were also run under load. `bun run check` runs its four steps in parallel via `run-p`, and under contention two debounce tests (`FilteredCharacterList` and `FilteredHouseList`, both asserting no filtering after 200ms against a 300ms debounce) fail on timing. Run sequentially on the same tree they pass, which is the 652-pass result recorded above. Neither test touches content or the integrity checks.

## The gate

`reciprocalAsymmetries` was added to `lib/content-integrity.ts` and its output folded into `contentIntegrityErrors`, so CI fails on a one-sided kinship edge the same way it already fails on a reference that resolves to nothing. `lib/content-integrity.test.ts` covers each rule in isolation, the symmetric case, the dangling-slug case that belongs to the outbound check, and the whole corpus.

Orphan count itself is **not** gated. 439 entries have no inbound reference, 125 of them structurally, so a threshold on that number could never go green and would only teach people to raise it.
