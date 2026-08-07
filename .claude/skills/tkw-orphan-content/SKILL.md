---
name: tkw-orphan-content
description: Use when asking what in this repo nothing links to. Triggers include "are there orphan entries", "which pages are unreachable", "does anything link to this character", "find dead-end content", "this page only exists at its URL", "which entries have no inbound references", "is every castle reachable", "why does nothing point at X", "check the reference graph", "find one-sided relationships", "A lists B as a parent but B does not list A", or after bulk-adding entries to `content/`.
---

# Orphan Content

## Overview

`lib/content-integrity.ts` walks the reference graph outbound and fails CI on a reference that resolves to nothing. Nothing walked it inbound. An entry that nobody points at still passes every schema, still prerenders, still answers at its URL. It is **invisible, not broken**, so no build, test, or type error mentions it.

That is the same class of gap that hid a whole collection: `app/events/` prerenders 53 detail pages with no `/events/` index route and no `NAV_ITEMS` entry, so the only way in is the timeline canvas. The audit reports it as a finding rather than fixing it, so the gap cannot silently come back.

`audit-orphans.ts` in this directory counts inbound references per entry across all three linking mechanisms. **It is read-only and modifies nothing.**

## Boundary with `tkw-content-triage`

Both count inbound references; they rank on opposite axes.

| Skill                | Ranks by                  | Its finding                                 |
| -------------------- | ------------------------- | ------------------------------------------- |
| `tkw-content-triage` | how **empty** an entry is | a thin stub that lots of pages already want |
| `tkw-orphan-content` | how **unreachable** it is | a finished entry that no page links to      |

A fully written page nothing points at is invisible to triage: its body is long, so it never enters the ranking. It is this skill's headline finding. Ten of them were Kings of Winter.

## The three linking mechanisms

Each resolves differently, and only two of them produce a link.

| Mechanism              | Where it lives                                                                                                                                                                                                                                        | Produces a link?                        | Breaks when                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| **Typed frontmatter**  | `primary-house`, `parents`, `spouses`, `children`, `heads`, `notable-members`, `seat`/`seats`, `liege`, `cadet-houses`, `ancestral-weapons`, `liege-house`, `sworn-houses`, `wielders`, `riders`, `commanders`, `casualties`, `participants[].houses` | yes, wherever a page renders that field | a slug is misspelled, so it silently resolves to nothing |
| **`mentions`**         | characters, houses, weapons, dragons, battles                                                                                                                                                                                                         | **no, not on its own**                  | always, unless the body also spells the name             |
| **Prose auto-linking** | `buildProseLinkIndex` + `remarkProseLinks` in `lib/prose-links.ts`                                                                                                                                                                                    | yes                                     | the name changes, or a longer form shadows it            |

**`mentions` is not a link.** Its only consumer is `buildProseLinkIndex`, which uses it to _widen surface forms_: a mentioned character also matches on their first name, a mentioned house on its short name. Nothing renders a mentions list. If the mentioning body never spells the name, the mention produces nothing at all.

**Prose linking only runs on four collections.** `app/characters`, `app/houses`, `app/weapons` and `app/dragons` pass a `proseLinks` index to `renderMarkdown`. `app/battles`, `app/castles` and `app/events` call `renderMarkdown(body)` bare, so their bodies emit no links, and battles, castles and events are not link _targets_ either. No body in the repo can ever link to a battle or an event.

**Four typed fields are read backwards.** The app builds a reverse index for them, so they make both endpoints reachable:

| Field              | Reverse index built in                                 |
| ------------------ | ------------------------------------------------------ |
| `weapons.wielders` | `app/characters/[slug]`, filters weapons by `wielders` |
| `dragons.riders`   | `app/characters/[slug]`, filters dragons by `riders`   |
| `dragons.house`    | `app/houses/[slug]`, `dragonsForHouse`                 |
| `primary-house`    | `buildFamilyTree` on the house page                    |

`primary-house` reads backwards **only conditionally**. `app/houses/[slug]/page.tsx` renders `notable-members` _or_ the family tree, never both, and `buildFamilyTree` skips `exclude-from-tree: true`. So a character can carry a correct `primary-house` and still be unreachable from that house's page. That single condition accounts for 10 of the 14 remaining character orphans: House Stark marks 29 pre-Conquest Kings of Winter `exclude-from-tree` and has no `heads` list, so 10 finished entries have no way in and 7 more hang on prose alone.

## Finding classes

| Class                    | Meaning                                                                       | Severity                                           |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| **Orphan**               | zero typed references, zero mentions, zero prose links                        | invisible page; triage by cause, not by count      |
| **Prose-only**           | reachable, but only because some body happens to spell the name               | fragile; a rename or a `placeholder: true` cuts it |
| **Mentions-only**        | listed in a `mentions` array, but no body spells the name, so no link renders | declared intent that ships nothing                 |
| **Reciprocal asymmetry** | A names B; B's reciprocal field omits A                                       | **unambiguous defect, gated in CI**                |
| **Unrouted collection**  | no index route, or an index route not in `NAV_ITEMS`                          | structural; whole collection has no list page      |

Only the asymmetry class is gated. `reciprocalAsymmetries` in `lib/content-integrity.ts` covers character kinship, the only genuinely symmetric relation in the corpus, and `contentIntegrityErrors` folds its output into the errors CI already fails on. Orphan _count_ is deliberately not gated: 439 entries have no inbound reference and most of them never will, so a gate on the number could never go green.

`houses.seat` versus `castles.liege-house` looks reciprocal and is not: five extinct houses name `harrenhal` as their seat while the castle names one current holder, and both readings are correct. `houses.ancestral-weapons` is likewise a curated subset of the weapons whose `current-house` names that house, not its inverse. Neither is checked.

## Quick Reference

```bash
bun .claude/skills/tkw-orphan-content/audit-orphans.ts                      # full report
bun .claude/skills/tkw-orphan-content/audit-orphans.ts --collection castles # one collection
bun .claude/skills/tkw-orphan-content/audit-orphans.ts --json               # machine-readable

bun test lib/content-integrity.test.ts   # the gated half: asymmetries plus outbound refs
bun run check                            # what CI runs
```

Run from the repo root; it resolves `@/lib/content` through `tsconfig.json` paths, so it reads the same loaders and Zod schemas the site does. Takes about three seconds.

## Baseline

Measured on `main`, then after the wiring in `docs/superpowers/baselines/tkw-orphan-content.md`.

| Collection | Entries    | Orphans before | Orphans after |
| ---------- | ---------- | -------------- | ------------- |
| battles    | 72         | 72             | 72            |
| castles    | 146        | 36             | **24**        |
| characters | 920 to 919 | 16             | **14**        |
| dragons    | 7          | 1              | 1             |
| events     | 53         | 53             | 53            |
| houses     | 468        | 273            | 273           |
| weapons    | 30         | 3              | **2**         |
| **total**  |            | **454**        | **439**       |

Reciprocal asymmetries: **51 before, 0 after.** Mentions-only: 1 before, 0 after. Prose-only: 46 before, 44 after.

Battles and events cannot be linked from any body: the link layer has no target kind for them. That is an architectural gap, not a content backlog, so their orphan counts stay flat and are not work items. Of the 468 houses, 273 have no character, castle, weapon or dragon attached to them at all; that is a writing backlog for `tkw-content-triage`, not drift.

## Evidence before adding a reference

**Never add a reference to make a number go down.** Every reference must be something the corpus or AWOIAF already asserts. Four shapes qualify, and all 140 references added in the baseline run came from one of them:

| Shape                      | The evidence                                                                                               | Found here |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Completing a reciprocal    | one side already declares the relationship; the other side only has to agree                               | 51         |
| Repairing a dangling slug  | the house names a seat that does not resolve, and the castle it normalizes to names that house back        | 9          |
| Attaching an existing name | the `seats[]`, `heads[]` or `notable-members[]` entry already spells the name; only the `slug` was missing | 79         |
| Honouring a stated origin  | the weapon's own `origin-house` and body name the house, and the house listed nothing                      | 1          |

The name-attachment shape is the biggest and the cheapest: an entry with `name:` and no `slug:` renders as plain text, so the house names a real person or castle and links nowhere. `InfoRow` and the notable-members list both gate on the slug resolving. Match strictly, on the honorific-stripped name **plus** `primary-house`, and skip anything ambiguous; one Frey head matched two Walders and was left alone.

If the only justification is "it seems plausible", leave the entry orphaned and say so. An honest orphan list is a result. Fourteen characters, twenty-four castles, two weapons and one dragon are still unreachable here, each for a stated reason.

When you do need to check AWOIAF, direct `WebFetch` is Cloudflare-blocked and 403s. Use the Wayback CDX API plus `curl` plus `textutil`; `tkw-populate-character` documents that pipeline.

## Common mistakes

| Mistake                                                           | Why it goes wrong                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding a character to `houses.notable-members` to un-orphan them  | The house page renders `notable-members` **or** the family tree. Giving a tree house its first notable member hides every other member.                                         |
| Counting `mentions` as reachability                               | Nothing renders a mentions list. Without the name in prose it links nowhere.                                                                                                    |
| Counting `weapons.wielders` in one direction only                 | The character page builds the reverse index, so the weapon is reachable. One-way counting reported 11 live weapons as orphans.                                                  |
| Grepping frontmatter for a slug to decide it is referenced        | Prose auto-linking references by _name_, never by slug. Grep misses every prose link.                                                                                           |
| Treating the orphan count as the number to drive down             | 125 of the 439 are battles and events, which no body can link to at all. The count is a triage input, not a target.                                                             |
| Fixing an asymmetry by deleting the declaration                   | That destroys a fact to silence a check. Add the missing reciprocal instead.                                                                                                    |
| Completing a reciprocal into a duplicate entry                    | `jason-lannister` duplicated `jason-lannister-dance`; agreeing with it would have rendered the same man twice as Loreon's parent. Check for a same-name twin before completing. |
| Assuming `lib/relations.ts` already does this                     | `findOrphanSlugs` there finds _dangling_ slugs, not orphans, and nothing outside its own test imports the module.                                                               |
| Reporting `houses.seat` / `castles.liege-house` drift as a defect | 22 seats mismatch and all 22 are correct; Harrenhal alone has five former holders. One-to-many on purpose.                                                                      |

## Related skills

- `tkw-content-triage`: which thin entries to write next, ranked by demand
- `tkw-populate-character`, `tkw-populate-house`: filling an entry once you have picked it
- `tkw-sigil-audit`: the same drift problem for `public/sigils/` and the `SIGIL_SLUGS` allowlist
