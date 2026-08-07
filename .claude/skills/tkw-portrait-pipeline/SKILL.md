---
name: tkw-portrait-pipeline
description: Use when adding, replacing, naming, or auditing character portrait art in this repo. Triggers include "add a portrait for X", "here is art for Eddard Stark", "why is this character showing a generic face", "the portrait isn't showing up", "the wrong picture is on this page", "how many characters have portraits", "which characters still need art", "what size should portraits be", "key out the green screen on this portrait", or after dropping files into `public/characters/`.
---

# Portrait Pipeline

## Overview

`findPortrait` in `lib/portraits.ts` **probes filenames, it never reads the directory**. Art whose filename is one character off a slug is not an error, it is invisible: the page falls back to a hashed placeholder that looks like a deliberate design choice. Nothing in the build, the type checker, or the runtime notices.

That is the whole failure mode. Every check in this skill exists because a wrong filename and no filename are indistinguishable on the rendered page.

Measured on `main` before this skill landed: **209 of 764 rendered characters (27.4%) had dedicated art**; the other 555 rendered one of ten placeholders. `public/characters/` held 221 files at 53.9MB. Two of those 221 resolved to nothing at all.

Scope boundary: this skill owns one portrait end to end (source, key, crop, size, name, place, verify) and the state of `public/characters/`. Whole-repo asset weight and orphans in other directories belong to `tkw-image-optimize`; sigils belong to `tkw-sigil-audit`.

## Resolution order (know this first)

`findPortrait(slug, sex)` returns the **first** path that exists:

| Step | Candidate                                       | Notes                                                      |
| ---- | ----------------------------------------------- | ---------------------------------------------------------- |
| 1    | `/characters/<slug>.png`                        | `PORTRAIT_EXTENSIONS[0]`                                   |
| 2    | `/characters/<slug>.webp`                       |                                                            |
| 3    | `/characters/<slug>.jpg`                        | what all 221 files on disk actually use                    |
| 4    | `/characters/<slug>.jpeg`                       |                                                            |
| 5    | `/characters/unknown-<male\|female>-0<1-5>.jpg` | djb2 hash of the slug, `sex === "f"` picks the female pool |

Consequences that drive every check:

- **Step 5 always succeeds.** There is no broken-image state and no 404, so a misnamed file produces a page that looks finished. This is the opposite of `sigilFile`, which can 404.
- **The slug is the only key.** `findPortrait` is called with `frontmatter.slug`, never with a filename, so the file must be named `<slug>.<ext>` exactly. `vaemond-targaryen.jpg` sat in the repo from #22 (2026-06-22) until this skill's first run while Vaegon Targaryen's page rendered a placeholder.
- **Two extensions for one slug is silent dead weight.** Step 1 beats step 3, so adding `x.png` next to `x.jpg` orphans the JPEG without removing it.
- **Placeholder assignment is deterministic, not random.** The same slug always gets the same variant, so a "wrong-looking" generic face is a coverage gap, not a bug.
- **Drafts and placeholders never render.** `generateStaticParams` filters `draft` and `placeholder`, so 156 of the 920 entries need no art. Coverage is measured against the 764 that render.

## The pipeline for one portrait

| Step     | What to do                                                                               | Why                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1 Source | Get the art. This skill does not generate or invent art.                                 | Uncovered characters are ranked, not filled.                                                                                  |
| 2 Key    | Flat green or blue backdrop: use `chroma-key-removal`, staged in `~/Downloads/temp/out/` | Never key in place and never write straight into `public/`.                                                                   |
| 3 Crop   | `image-center-crop` to **3:2**                                                           | `FilteredCharacterList` cards crop to `aspect-ratio: 3 / 2` with `object-fit: cover`. Off-ratio art loses its subject's head. |
| 4 Size   | Resize to **1152x768**, JPEG **q=95**, sampling `2x2,1x1,1x1`                            | 172 of 221 files are exactly 1152x768; 49 are 1168x784. Sources land 250-330KB.                                               |
| 5 Name   | `<slug>.jpg`, slug copied from the frontmatter, never retyped                            | The near-miss class exists entirely because of this step. Copy, do not spell.                                                 |
| 6 Place  | Move into `public/characters/`, nothing else to register                                 | No allowlist. Unlike sigils, there is no `SIGIL_SLUGS` equivalent to edit.                                                    |
| 7 Verify | `bun .claude/skills/tkw-portrait-pipeline/audit-portraits.ts` then `bun run test`        | Coverage goes up by one; integrity errors stay at zero.                                                                       |

A transparent PNG from step 2 must be flattened before step 4. Portraits carry no alpha; only sigils do.

## Failure classes

| Class                   | Symptom on the page                     | Cause                                                   | Fix                                       |
| ----------------------- | --------------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| **Near miss**           | Generic placeholder, art exists on disk | Filename is close to but not exactly the slug           | Rename to the slug                        |
| **Orphan**              | Nothing; the file is pure weight        | Filename matches no slug and none is close              | Write the entry, reserve it, or delete it |
| **Duplicate**           | Nothing visible, one file is dead       | Two probed extensions share a stem                      | Delete the one later in probe order       |
| **Unprobed extension**  | Generic placeholder                     | `.gif`, `.avif`, `.tif`: never in `PORTRAIT_EXTENSIONS` | Re-encode to `.jpg`                       |
| **Missing placeholder** | 404 for a slice of the corpus           | One of the ten `unknown-*.jpg` files was deleted        | Restore it                                |
| **Oversized**           | None; repo, clone, and build time pay   | Source far above the 1200px any view renders            | Downscale to 1152x768                     |
| **Off-aspect**          | Card crop cuts the subject              | Not 3:2                                                 | `image-center-crop`                       |

Only the first two change what a reader sees, and neither fails anything today without the integrity check.

## Quick Reference

```bash
# Audit: coverage, orphans, near misses, duplicates, oversized, off-aspect, uncovered ranking
bun .claude/skills/tkw-portrait-pipeline/audit-portraits.ts
bun .claude/skills/tkw-portrait-pipeline/audit-portraits.ts --json

# Gate: orphan and near-miss filenames fail CI here
bun test lib/portrait-integrity.test.ts
bun run test

# Confirm a slug before naming the file
ls content/characters/ | grep -i <name>

# Prepare one portrait (after chroma-key-removal, from ~/Downloads/temp/out/)
magick in.png -filter Lanczos -resize 1152x768 \
  -sampling-factor 2x2,1x1,1x1 -quality 95 -strip \
  public/characters/<slug>.jpg

# What the repo already uses
identify -format "%f q=%Q %wx%h %B\n" public/characters/<slug>.jpg

# Which portrait a slug actually resolves to
bun -e 'const { findPortrait } = await import("./lib/portraits.ts");
console.log(await findPortrait("vaegon-targaryen", "m"));'
```

## Reading the audit

| Section      | Means                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `COVERAGE`   | Dedicated art versus placeholder fallback, over the 764 rendered characters                                            |
| `ORPHANS`    | Stems matching no slug. `RESERVED` means deliberate; a near miss names the rename target                               |
| `DUPLICATES` | One slug, two probed extensions: which `findPortrait` returns and which is dead weight                                 |
| `OVERSIZED`  | Over 400KB or over 1800px wide (1.5x the 1200px the detail page declares)                                              |
| `OFF-ASPECT` | Outside 3:2 +/- 0.05, which covers both 1152x768 (1.500) and 1168x784 (1.490)                                          |
| `UNCOVERED`  | Characters with no art, ranked by inbound frontmatter references, the same fields `lib/content-integrity.ts` validates |

The near-miss suggestion **skips slugs that already have their own art**. Raw edit distance gets this wrong: `vaemond-targaryen` is one edit from `aemond-targaryen` (which has a portrait) and two from `vaegon-targaryen` (which did not, and is the chained Archmaester the picture actually shows). Do not simplify `nearestSlug` back to a plain minimum.

## The integrity check

`lib/portrait-integrity.ts` reads the directory and compares it back to `content/characters/`. `lib/portrait-integrity.test.ts` gates it, so `bun run test` fails on a near miss or an orphan the way it already fails on sigil drift.

It imports `PORTRAIT_EXTENSIONS`, `PLACEHOLDER_VARIANTS`, and `PLACEHOLDER_EXTENSION` from `lib/portraits.ts` rather than restating them. Change the probe order in one place and both the app and the check move together.

`RESERVED_PORTRAITS` holds art staged ahead of its markdown, currently `thoros-of-myr`. It is not a way to make the suite green: every entry needs a named follow-up, and the check errors once the content entry appears so the reservation cannot rot.

## Common mistakes

| Mistake                                                     | Why it goes wrong                                                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typing the slug from the character's name                   | `vaemond` for `vaegon`, `thoros-of-myr` for an entry that does not exist. Copy it from the frontmatter.                                            |
| Deleting an orphan on sight                                 | It is often finished art one rename from working. Check `nearestSlug` and the picture itself first.                                                |
| Trusting the near-miss suggestion blindly                   | It is a heuristic. `vaemond-targaryen.jpg` is a maester in a chain of many metals; that identified Vaegon, not the closest string. Open the image. |
| Adding `<slug>.png` next to an existing `<slug>.jpg`        | PNG wins the probe and the JPEG becomes invisible weight. Delete the loser.                                                                        |
| Assuming a generic face means a broken path                 | There is no broken state. A placeholder means no file matched, full stop.                                                                          |
| Committing a portrait at source resolution                  | `greatjon-umber.png` shipped at 3072x2048 and 5.5MB, 17x its siblings, for a view that renders at most 1200px.                                     |
| Expecting an allowlist to register the file                 | Portraits resolve by probe. There is no `SIGIL_SLUGS` equivalent; the filename is the registration.                                                |
| Claiming a smaller source speeds up the page                | `next/image` routes portraits through the Netlify CDN, which resizes at request time. Smaller sources buy clone and build time.                    |
| Auditing `public/sigils/` or `public/map/` with this script | It reads `public/characters/` only. Use `tkw-sigil-audit` and `tkw-image-optimize`.                                                                |
| Running the audit from a subdirectory                       | It resolves `@/lib/content` and `process.cwd()`. Run it from the repo root.                                                                        |

## Related skills

- `chroma-key-removal`: step 2, keying a flat green or blue backdrop to transparent PNG
- `image-center-crop`: step 3, trimming to 3:2 without letterboxing
- `tkw-populate-character`: writing the `content/characters/<slug>.md` a reserved portrait is waiting on
- `tkw-content-triage`: ranks which entries to write next; this skill ranks which need art
- `tkw-image-optimize`: whole-repo asset weight and orphans outside `public/characters/`
- `tkw-sigil-audit`: the same drift problem for `public/sigils/`, with an allowlist instead of a probe
