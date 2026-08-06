---
name: tkw-image-optimize
description: Use when auditing, shrinking, or cleaning up images in this repo. Triggers include "the repo is huge", "why is the clone so big", "optimize the images", "compress the sigils", "the map page is slow", "find unused images", "are there orphan assets", "which images are unreferenced", "convert to webp", or after bulk-adding art to `public/`.
---

# Image Optimize

## Overview

`public/` is 229MB across 447 images. That number hides two unrelated problems, and the fix for one does nothing for the other:

1. **Dead weight.** 43 files (57.5MB) that nothing can resolve to.
2. **Heavy delivery.** Files that do render, at sizes far above what the render needs.

`audit-assets.ts` in this directory reports both, plus broken references pointing the other way. **It is read-only and deletes nothing.**

Sigils are deliberately out of scope here. `lib/sigil-integrity.ts` owns that resolution order and is gated in CI, so use `tkw-sigil-audit` for them. Auditing them in two places would fork the rules.

## Decide what you are optimizing for first

This is the step people skip, and it determines whether re-encoding helps users at all.

Anything rendered through `next/image` goes through the custom loader in `lib/netlify-image-loader.ts`, which rewrites the URL to `/.netlify/images?url=...&w=...&q=...`. **Netlify's Image CDN resizes and re-encodes those at request time.** The user already receives an optimized derivative no matter how large the source is.

| Path                   | Consumer                                     | Served through CDN? | Re-encoding the source helps  |
| ---------------------- | -------------------------------------------- | ------------------- | ----------------------------- |
| `sigils/`              | `Sigil.tsx`                                  | yes                 | repo and build weight only    |
| `characters/`          | `characters/[slug]`, `FilteredCharacterList` | yes                 | repo and build weight only    |
| `battles/`, `weapons/` | detail pages                                 | yes                 | repo and build weight only    |
| `menu-icons/`          | `SiteMenu.tsx`                               | yes                 | repo and build weight only    |
| `map/`                 | `WorldMap.tsx`                               | **no**              | **delivered bytes, directly** |

`WorldMap.tsx:253` draws the map with a raw SVG `<image href={src}>`, not `next/image`:

```tsx
<svg width={size.w} height={size.h}>
  <image href={src} ... />
</svg>
```

So `/maps` downloads `/map/the-known-world-enhanced.jpg` whole: **10.5MB, 10000x8300**. That is the only asset on the site where re-encoding changes what a user waits for, and it is the highest-value single fix in this skill.

Everything else buys clone time, git history weight, Netlify build time, and cold-cache transform latency. Those are real, but do not describe them as page-speed wins.

## Running the audit

```bash
bun .claude/skills/tkw-image-optimize/audit-assets.ts
bun .claude/skills/tkw-image-optimize/audit-assets.ts --json
```

Three sections come back:

- **BROKEN REFERENCES**: a literal path in source with no file on disk. Always a live bug.
- **DEAD ASSETS**: a file nothing resolves to, grouped by directory, largest first.
- **HEAVY RESOLVED ASSETS**: files that do render, over 200KB.

The audit understands that `characters/`, `battles/`, and `weapons/` resolve by **filesystem probe against a content slug**, not by literal path. `findPortrait`, `findBattleImage`, and `findWeaponImage` each try a list of extensions for `<slug>.<ext>`. A plain grep would call every one of those files unreferenced.

It also skips `*.test.ts` and `*.test.tsx`, which cite fixture paths like `/characters/foo.jpeg` that were never meant to exist, and it treats `characters/unknown-(male|female)-NN.jpg` as reachable because `findPortrait` hashes slugs into that pool.

## Reading a dead-asset result

Dead does not always mean delete. Three different causes need three different fixes:

| Cause            | Example                                           | Fix                       |
| ---------------- | ------------------------------------------------- | ------------------------- |
| Genuinely unused | `map/map_natural_8K.jpg`, superseded map versions | Delete                    |
| Staging cruft    | `backups/`, `castles/<uuid>.jpg`, `sprites/`      | Delete                    |
| **Misnamed art** | `characters/vaemond-targaryen.jpg`                | **Rename**, do not delete |

The third case is the one that matters. `vaemond-targaryen.jpg` is dead because the character's slug is `vaemond-velaryon`. The art was drawn, committed, and never rendered: the page silently falls back to a generated `unknown-male-NN.jpg` placeholder, which looks intentional. Check every dead entry under `characters/`, `battles/`, and `weapons/` against near-miss slugs before deleting anything.

`logo.png`, `icon-192.png`, and `icon-512.png` audit as dead because no web manifest exists and Next serves favicons from `app/icon.png` and `app/apple-icon.png`. Confirm nothing external links them before removing.

## Re-encoding

Available on this machine: `cwebp`, `magick`, `sips`, `ffmpeg`. Not installed: `oxipng`, `pngquant`, `avifenc`.

Measured on real files from this repo:

| Asset                  | Source     | Result    | Command                                        |
| ---------------------- | ---------- | --------- | ---------------------------------------------- |
| Map (10000x8300)       | 10.5MB JPG | **3.6MB** | `cwebp -q 82 in.jpg -o out.webp`               |
| Portrait (3072x2048)   | 5.5MB PNG  | **352KB** | `cwebp -q 82 in.png -o out.webp`               |
| Portrait (1168x784)    | 268KB JPG  | **92KB**  | `cwebp -q 82 in.jpg -o out.webp`               |
| Menu icon (960x960)    | 772KB PNG  | **40KB**  | `cwebp -q 90 -resize 512 0 in.png -o out.webp` |
| Sigil (960x960, alpha) | 620KB PNG  | **84KB**  | `cwebp -q 90 in.png -o out.webp`               |

Sigils and menu icons carry alpha; `cwebp` preserves it. Do not flatten them onto a background.

Lossless PNG recompression is not worth reaching for here: `magick -define png:compression-level=9` took a 620KB sigil to 608KB, a 2% saving, because the source art is photographic rather than flat heraldry (31,427 distinct colors in that one file).

## Changing format: which consumers accept WebP for free

This is the constraint that decides how much work a conversion is.

**Free.** The probe lists in `lib/portraits.ts`, `lib/battle-image.ts`, and `lib/weapon-image.ts` already include `webp`:

```ts
const PORTRAIT_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;
```

Drop `<slug>.webp` in, delete `<slug>.jpg`, and it resolves with no code change.

**Needs a one-line edit.** The map is a literal in `app/maps/page.tsx:24`.

**Needs a code change, and read `tkw-sigil-audit` first.** `Sigil.tsx` hardcodes the extension:

```tsx
src={`/sigils/${sigilFile({ slug, region })}.png`}
```

`sigilFile` returns a basename only, so every sigil must share one extension. Converting sigils is all-or-nothing across 156 files plus that line. Do not convert a subset.

## Verification

After any change:

```bash
bun .claude/skills/tkw-image-optimize/audit-assets.ts   # broken refs back to none
bun run test                                            # includes sigil integrity
bun run build                                           # static export resolves everything
```

`bun run test` matters because deleting or renaming under `public/sigils/` fails `lib/sigil-integrity.test.ts` in CI. A visual check of `/maps`, a character page, and the menu drawer catches the rest, since a missing image is invisible to tests when a placeholder fallback exists.

## Known live bug

`SiteMenu.tsx:24` references `/menu-icons/castles.png`, which does not exist. Every other nav entry has its icon. The castles item in the drawer renders a broken image today. Either add the file or fall back like the map default on line 168.

## Common mistakes

| Mistake                                 | Why it goes wrong                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Claiming re-encoding speeds up the site | Everything except the map is transformed by the Netlify CDN at request time. Only `/map` delivery changes. |
| Deleting every dead asset               | Some are misnamed art that should be renamed to a real slug. Deleting destroys work.                       |
| Grepping for filenames to find orphans  | Portraits, battle art, and weapon art resolve by slug probe. Grep reports them all unreferenced.           |
| Converting some sigils to WebP          | `Sigil.tsx` hardcodes `.png` for all of them. Partial conversion breaks every converted house.             |
| Running `oxipng` or `pngquant`          | Neither is installed. Use `cwebp` or `magick`.                                                             |
| Committing without `bun format:check`   | `oxfmt` formats markdown and TS across the repo, and CI fails the build on drift.                          |
