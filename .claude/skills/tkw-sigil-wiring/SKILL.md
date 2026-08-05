---
name: tkw-sigil-wiring
description: Use for anything about which sigil image renders in the-known-world repo. Registering — "use this image for house X", "update house X's sigil", "house X is showing its region's sigil", "register house X's sigil", or after adding a `public/sigils/<house>.png`. Auditing — "are there any unreferenced sigils", "find orphan sigil images", "is every sigil PNG used", "check for missing sigils", "sigil audit", "which houses have art but render the regional fallback", or after bulk-adding PNGs. Covers the `SIGIL_SLUGS` resolution order, the one-line registration edit, the six drift classes, and how to read the integrity errors.
---

# TKW Sigil Wiring

## Overview

Every sigil in this repo is an individual PNG at `public/sigils/<slug>.png`. Three inputs decide what renders and they can drift apart silently:

1. the PNGs in `public/sigils/`
2. the `SIGIL_SLUGS` allowlist in `lib/sigil.ts`
3. the markdown in `content/houses/` and `content/characters/`

Nothing in the Next.js build fails when they disagree. Art ships but never renders, or a registration points at a file that isn't there — and the fallback looks plausible enough to hide it.

Two tasks live here: **register a PNG** (§Task A) and **audit for drift** (§Task B). Both need the resolution order first.

**No sprite sheet, no shared CSS file, no `--col`/`--row` custom properties.** Older versions of this repo used a sprite sheet; that architecture is gone. `styles/sigils.css` does not exist.

## Resolution order — read this first

`sigilFile({ slug, region })` in `lib/sigil.ts` decides which file renders, in this order:

1. **`slug` is in `SIGIL_SLUGS`** → `/sigils/(SLUG_ALIASES[slug] ?? slug).png`
2. **else `region` is a key of `REGION_FILE`** → the regional sigil (`crownlands` → `/sigils/crownlands.png`, `north` → `/sigils/the-north.png`)
3. **else** → `/sigils/unknown-westeros.png`

`components/Sigil/Sigil.tsx` only calls `sigilFile` and builds the `src`. It holds no allowlist and needs no edits.

Consequences that drive everything below:

- Step 1 is an **allowlist, not a filesystem probe.** A PNG on disk with no `SIGIL_SLUGS` entry is invisible to the app; the house silently renders its region's sigil instead.
- `SLUG_ALIASES` **redirects** a registered slug to a different file (`durrandon` → `baratheon`). A registered slug does not guarantee its own PNG is reachable.
- `SIGIL_SLUGS` holds **character slugs too**, not only houses. `bronn` and `duncan-the-tall` are characters; `app/characters/[slug]/page.tsx` passes a character slug through `SIGIL_SLUGS.has(slug)`. Never call an entry houseless without checking `content/characters/` as well.
- Two allowlists in `lib/sigil-integrity.ts` suppress deliberate exceptions and are the **single source of truth** for them: `SENTINEL_SLUGS` (registered slugs with no markdown — currently the `unknown` placeholder) and `RESERVED_IMAGES` (PNGs held for future use — currently `unknown-essos`, the Essosi counterpart to `unknown-westeros`).

## File locations

| Artifact               | Path                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| Resolution + allowlist | `lib/sigil.ts` (`SIGIL_SLUGS`, a `Set<string>`)                                |
| Drift checks           | `lib/sigil-integrity.ts` (`sigilIntegrityErrors`, `loadSigilImages`)           |
| CI gate                | `lib/sigil-integrity.test.ts`                                                  |
| Co-located unit test   | `lib/sigil.test.ts`                                                            |
| Renderer               | `components/Sigil/Sigil.tsx` — calls `sigilFile`, do not edit                  |
| Source image           | `public/sigils/<slug>.png` (URL `/sigils/<slug>.png`)                          |
| Slug shape             | lowercased, hyphenated surname — `cargyll`, `bar-emmon`, `fossoway-cider-hall` |

---

## Task A — Register a PNG so a house stops rendering the regional fallback

**Use when:** the user says "use `<house>.png` for house X", "update/fix house X's sigil", a house is visibly rendering its region's sigil (or `unknown-westeros.png`) and a standalone PNG already exists, or a new `public/sigils/<house>.png` was just added and needs wiring.

**Don't use for:** removing a chroma-key background from the source image (use `chroma-key-removal` first), adding a brand-new `content/houses/` entry (use `tkw-content-populate`), changing how `Sigil` itself works, or any non-sigil image swap.

### The edit

Open `lib/sigil.ts`, find the `SIGIL_SLUGS` Set, add the slug as a string literal. **That is the entire edit.**

**Before:**

```ts
  "blackfyre",
  "bar-emmon",
  "caswell",
  "celtigar",
```

**After:**

```ts
  "blackfyre",
  "bar-emmon",
  "cargyll",
  "caswell",
  "celtigar",
```

Insert near alphabetically-adjacent neighbors. The existing list is not strictly alphabetical — it's loosely chronological by introduction — so pick the spot that reads naturally near similar houses. **Do not reorder the rest of the set.**

### Procedure

1. **Confirm the PNG exists** at `public/sigils/<slug>.png`. If it doesn't, stop and tell the user; don't invent a path or rename a file silently.
2. **Check the slug isn't already in the set.** If it is, the house is already wired and the bug is elsewhere — missing PNG, wrong slug spelling, a `SLUG_ALIASES` redirect, or the wrong house in the content file. Stop and surface that; don't add a duplicate.
3. **Add the slug** as one new line, trailing comma, matching the surrounding style.
4. **Don't touch** `REGION_FILE`, `SLUG_ALIASES`, the `Sigil` component, or any other house's entry.
5. **Don't add** a CSS rule, sprite-sheet entry, or `styles/sigils.css`. None of that exists here.

### Verification

- The diff for `lib/sigil.ts` shows exactly one inserted line inside `SIGIL_SLUGS`. No other file changes.
- ```bash
  rg "\"<slug>\"" lib/sigil.ts
  ls public/sigils/<slug>.png
  ```
- `bun run test` — `lib/sigil.test.ts` covers the resolution order and asserts recently added standalone sigils are registered.
- Optional sweep: `bun test --isolate lib/sigil-integrity.test.ts` confirms the new slug is reachable and nothing else drifted.

Commit (only when asked) per `tkw-git-commit-and-pr-format`. No body is needed for a one-line registration:

```
TKW: register `cargyll` in `SIGIL_SLUGS` to use `/sigils/cargyll.png`
```

### Worked example — House Cargyll

`cargyll.png` is already at `public/sigils/cargyll.png` and `content/houses/cargyll.md` lists `region: crownlands`, so the house currently renders `/sigils/crownlands.png`. Adding `"cargyll",` to `SIGIL_SLUGS` makes `sigilFile({ slug: "cargyll", region: "crownlands" })` resolve to `cargyll`, and the `Image` renders `/sigils/cargyll.png`.

---

## Task B — Audit for drift

**Use when:** the user asks whether every PNG is used, whether every registration is backed, or after bulk-adding images.

`sigilIntegrityErrors()` **is** the audit. There is no separate script — duplicating it would create a second set of constants to keep in sync.

```bash
bun test --isolate lib/sigil-integrity.test.ts   # just the sigil checks
bun run test                                     # full suite, what CI runs
```

CI's `🧪 Test` step runs `bun run test`, so drift fails the build before merge.

For an ad-hoc report outside the test runner:

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

### The six failure classes

| Class                                | Symptom in the app                                | Cause                                                           |
| ------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------- |
| Unreferenced image, house exists     | House shows its regional sigil despite having art | PNG exists, slug missing from `SIGIL_SLUGS`                     |
| Unreferenced image, character exists | Houseless character shows a fallback              | Same, for a `content/characters/` slug                          |
| Dead asset                           | Nothing; the file is pure weight                  | PNG exists, no `SIGIL_SLUGS` entry and no content entry         |
| Alias shadow                         | House shows another house's sigil                 | Slug registered but `SLUG_ALIASES` redirects it elsewhere       |
| Broken reference                     | Broken image / 404 at runtime                     | Slug registered (or region mapped) with no PNG on disk          |
| Unbacked slug                        | None yet, but the entry is a typo or leftover     | `SIGIL_SLUGS` entry matching no house and no character markdown |

### Reading the errors

`sigilIntegrityErrors()` returns one string per problem, empty when clean. Map each to an action and give the user the choice rather than picking for them:

| Error shape                                                                   | Action to propose                                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `sigils/X.png: houses/X exists, but the slug is missing from SIGIL_SLUGS`     | Register the slug — Task A above                                                                                          |
| `sigils/X.png: characters/X exists, but the slug is missing from SIGIL_SLUGS` | Same registration; the slug is a houseless character                                                                      |
| `sigils/X.png: unreferenced, and no house or character entry uses this slug`  | Either write `content/houses/X.md` (`tkw-content-populate`), add it to `RESERVED_IMAGES` if deliberate, or delete the PNG |
| `sigils/X.png: registered, but SLUG_ALIASES redirects it to Y.png`            | Confirm the alias is intended; if so, the PNG is redundant                                                                |
| `sigils/X.png: missing, required by ...`                                      | Highest severity — it 404s in production. Add the PNG or drop the registration                                            |
| `SIGIL_SLUGS X: no houses/X or characters/X entry`                            | Check for a slug typo before assuming the entry is stale                                                                  |

### Audit scope

**Do:** report every error verbatim with its class, state the count, name the fix for each.

**Do not**, unless the user asks in the same breath:

- edit `SIGIL_SLUGS`
- delete any PNG
- create house markdown
- add entries to `SENTINEL_SLUGS` or `RESERVED_IMAGES` to make the suite go green
- commit anything

A clean report is a result. A green suite after silently widening an allowlist is a lie.

---

## Red flags — STOP and reconsider

| Thought                                                        | Reality                                                                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| "`SIGIL_SLUGS` is in `components/Sigil/Sigil.tsx`"             | It lives in `lib/sigil.ts`. The component only calls `sigilFile`.                                               |
| "I'll edit `styles/sigils.css`"                                | That file does not exist. Edit `lib/sigil.ts`.                                                                  |
| "I'll add a sprite-sheet `--col`/`--row` rule"                 | No sprite sheet. PNGs are served individually.                                                                  |
| "The PNG isn't there yet, I'll register the slug anyway"       | Confirm the file exists first; stop and ask if it doesn't.                                                      |
| "I'll alphabetize the whole `SIGIL_SLUGS` set while I'm here"  | No. One slug per edit.                                                                                          |
| "I'll rename the PNG to match my preferred slug"               | The slug is fixed by the `content/houses/` or `content/characters/` filename.                                   |
| "The image has a green background, I'll register it as-is"     | Run `chroma-key-removal` on the PNG first.                                                                      |
| "The slug is already in the set, I'll add it again to be sure" | No. Stop and investigate why the right PNG still isn't rendering.                                               |
| "I'll add a `SLUG_ALIASES` entry instead"                      | Aliases are for slugs that should display _another_ house's file (Durrandon shows Baratheon), not for new PNGs. |
| "The audit found errors, I'll fix them all and go green"       | Report first. Fixing is a separate, asked-for step.                                                             |

## Common mistakes

| Mistake                                                                | Fix                                                                                                                                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparing `public/sigils/*.png` against `content/houses/*.md` directly | Misses the allowlist entirely. Registration, not content, decides rendering.                                                                                    |
| Treating every `SIGIL_SLUGS` entry as a house                          | Characters live there too. Check `content/characters/` before flagging.                                                                                         |
| Flagging `unknown` as houseless                                        | Sanctioned placeholder sentinel, aliased to `unknown-westeros.png`.                                                                                             |
| Flagging `unknown-essos.png` as a dead asset                           | Reserved for unknown Essosi cities and towns. Already in `RESERVED_IMAGES`.                                                                                     |
| Flagging region files (`the-north`, `crownlands`, `dorne`…) as orphans | They're reached through step 2, never through `SIGIL_SLUGS`. The checks probe for them.                                                                         |
| Assuming a registered slug means its own PNG renders                   | `SLUG_ALIASES` can redirect it.                                                                                                                                 |
| Re-deriving `REGION_FILE` or `SLUG_ALIASES` by parsing `lib/sigil.ts`  | Both are module-private. `reachableSigilFiles()` probes `sigilFile()` instead, which is why it survives changes to those tables. Don't replace it with a regex. |
| Used the house's display name instead of its slug                      | Slug = lowercased, hyphenated, matching the content markdown filename.                                                                                          |
| Referenced `/public/sigils/<slug>.png` from other code                 | Never build the path manually; `Sigil` constructs it. Just register the slug.                                                                                   |

## Related skills

- `tkw-content-populate` — writing the missing `content/houses/<slug>.md`
- `chroma-key-removal` — prepping a new PNG before it is registered
- `tkw-git-commit-and-pr-format` — the commit for the registration
