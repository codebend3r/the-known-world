---
name: tkw-sigil-audit
description: Use when auditing sigil wiring in this repo. Triggers include "are there any unreferenced sigils", "find orphan sigil images", "is every sigil PNG used", "does every sigil have a house", "check for missing sigils", "sigil audit", "which houses have art but render the regional fallback", or after bulk-adding PNGs to `public/sigils/`. Covers the SIGIL_SLUGS resolution order, the six failure classes, and how to read the integrity errors.
---

# Sigil Audit

## Overview

Sigil rendering has three independent inputs that can drift apart: the PNGs in `public/sigils/`, the `SIGIL_SLUGS` allowlist in `lib/sigil.ts`, and the markdown in `content/houses/` + `content/characters/`. Nothing in the Next.js build fails when they disagree, so drift is silent: art ships but never renders, or a registration points at a file that isn't there.

`lib/sigil-integrity.ts` encodes the checks and `lib/sigil-integrity.test.ts` gates them in CI. **This skill explains what the errors mean and what to do about each one.** It does not fix drift on its own; report the findings and let the user choose.

## Resolution order (the thing you must know first)

`sigilFile({ slug, region })` in `lib/sigil.ts` decides which file renders, in this order:

1. **`slug` is in `SIGIL_SLUGS`** gives `/sigils/(SLUG_ALIASES[slug] ?? slug).png`
2. **else `region` is a key of `REGION_FILE`** gives the regional sigil (`crownlands` gives `/sigils/crownlands.png`, `north` gives `/sigils/the-north.png`)
3. **else** gives `/sigils/unknown-westeros.png`

Consequences that drive every check:

- Step 1 is an **allowlist, not a filesystem probe.** A PNG on disk with no `SIGIL_SLUGS` entry is invisible to the app. The house silently renders its region's sigil instead, which looks plausible and hides the bug.
- `SLUG_ALIASES` **redirects** a registered slug to a different file (`durrandon` gives `baratheon`). A registered slug does not guarantee its own PNG is reachable.
- `SIGIL_SLUGS` holds **character slugs too**, not only houses. `bronn` and `duncan-the-tall` are characters; `app/characters/[slug]/page.tsx` passes a character slug through `SIGIL_SLUGS.has(slug)`. Never call an entry houseless without also checking `content/characters/`.
- Two allowlists in `lib/sigil-integrity.ts` suppress deliberate exceptions, and they are the **single source of truth**: `SENTINEL_SLUGS` (registered slugs with no markdown, currently the `unknown` placeholder) and `RESERVED_IMAGES` (PNGs held for future use, currently `unknown-essos`, the Essos counterpart to `unknown-westeros`).

## The failure classes

| Class                                | Symptom in the app                                | Cause                                                           |
| ------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------- |
| Unreferenced image, house exists     | House shows its regional sigil despite having art | PNG exists, slug missing from `SIGIL_SLUGS`                     |
| Unreferenced image, character exists | Houseless character shows a fallback              | Same, for a `content/characters/` slug                          |
| Dead asset                           | Nothing; the file is pure weight                  | PNG exists, no `SIGIL_SLUGS` entry and no content entry         |
| Alias shadow                         | House shows another house's sigil                 | Slug registered but `SLUG_ALIASES` redirects it elsewhere       |
| Broken reference                     | Broken image / 404 at runtime                     | Slug registered (or region mapped) with no PNG on disk          |
| Unbacked slug                        | None yet, but the entry is a typo or leftover     | `SIGIL_SLUGS` entry matching no house and no character markdown |

## Running the audit

```bash
bun test lib/sigil-integrity.test.ts   # just the sigil checks
bun run test                           # full suite, what CI runs
```

The CI `🧪 Test` step runs `bun run test`, so drift fails the build before merge. There is no separate audit script: `sigilIntegrityErrors()` is the audit, and duplicating it in a standalone script would just create a second set of constants to keep in sync.

For an ad-hoc report outside the test runner, call the function directly:

```bash
bun -e 'const { loadSigilImages, sigilIntegrityErrors } = await import("./lib/sigil-integrity.ts");
const { loadAllHouses, loadAllCharacters } = await import("./lib/content.ts");
const [images, houses, characters] = await Promise.all([loadSigilImages(), loadAllHouses(), loadAllCharacters()]);
console.log(sigilIntegrityErrors({
  images,
  houseSlugs: new Set(houses.map((h) => h.frontmatter.slug)),
  characterSlugs: new Set(characters.map((c) => c.frontmatter.slug)),
}));'
```

## Reading the errors

`sigilIntegrityErrors()` returns one string per problem, empty when clean. Map each to an action, and give the user the choice rather than picking for them:

| Error shape                                                                   | Action to propose                                                                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `sigils/X.png: houses/X exists, but the slug is missing from SIGIL_SLUGS`     | Register the slug (use `tkw-sigil-png-override`)                                                                                  |
| `sigils/X.png: characters/X exists, but the slug is missing from SIGIL_SLUGS` | Same registration; the slug is a houseless character                                                                              |
| `sigils/X.png: unreferenced, and no house or character entry uses this slug`  | Either write `content/houses/X.md` (use `tkw-populate-house`), add it to `RESERVED_IMAGES` if it is deliberate, or delete the PNG |
| `sigils/X.png: registered, but SLUG_ALIASES redirects it to Y.png`            | Confirm the alias is intended; if it is, the PNG is redundant                                                                     |
| `sigils/X.png: missing, required by ...`                                      | Highest severity, it 404s in production. Add the PNG or drop the registration                                                     |
| `SIGIL_SLUGS X: no houses/X or characters/X entry`                            | Check for a slug typo before assuming the entry is stale                                                                          |

## Scope

**Do:** report every error verbatim with its class; state the count; name the fix for each.

**Do not**, unless the user asks in the same breath:

- edit `SIGIL_SLUGS`
- delete any PNG
- create house markdown
- add entries to `SENTINEL_SLUGS` or `RESERVED_IMAGES` to make the suite go green
- commit anything

A clean report is a result. A green suite after silently widening an allowlist is a lie.

## Common mistakes

| Mistake                                                                          | Fix                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparing `public/sigils/*.png` against `content/houses/*.md` directly           | That misses the allowlist entirely. Registration, not content, decides rendering.                                                                               |
| Treating every `SIGIL_SLUGS` entry as a house                                    | Characters live there too. Check `content/characters/` before flagging.                                                                                         |
| Flagging `unknown` as houseless                                                  | It is the sanctioned placeholder sentinel, aliased to `unknown-westeros.png`.                                                                                   |
| Flagging `unknown-essos.png` as a dead asset                                     | Reserved for unknown Essosi cities and towns. Already in `RESERVED_IMAGES`.                                                                                     |
| Flagging region files (`the-north`, `crownlands`, `dorne`, and so on) as orphans | They are reached through step 2, never through `SIGIL_SLUGS`. The checks probe for them.                                                                        |
| Assuming a registered slug means its own PNG renders                             | `SLUG_ALIASES` can redirect it.                                                                                                                                 |
| Re-deriving `REGION_FILE` or `SLUG_ALIASES` by parsing `lib/sigil.ts`            | Both are module-private. `reachableSigilFiles()` probes `sigilFile()` instead, which is why it survives changes to those tables. Don't replace it with a regex. |
| Looking for `SIGIL_SLUGS` in `components/Sigil/Sigil.tsx`                        | It lives in `lib/sigil.ts`. The component only calls `sigilFile`.                                                                                               |
| Looking for a sprite sheet or `styles/sigils.css`                                | Neither exists. One PNG per file, served individually.                                                                                                          |

## Related skills

- `tkw-sigil-png-override`: the one-line `SIGIL_SLUGS` registration that fixes the unreferenced-image class
- `tkw-populate-house`: writing the missing `content/houses/<slug>.md`
- `chroma-key-removal`: prepping a new PNG before it is registered
