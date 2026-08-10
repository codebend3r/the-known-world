# Portrait pipeline baseline

First run of `portrait-pipeline` against `main` at `d11fcfd`, plus the fixes it
justified. Reproduce with:

```bash
bun .claude/skills/portrait-pipeline/audit-portraits.ts
```

## Before

| Measure                                   | Value                   |
| ----------------------------------------- | ----------------------- |
| Character entries                         | 920                     |
| Rendered (not `draft`, not `placeholder`) | 764                     |
| Rendered with dedicated art               | **209 (27.4%)**         |
| Rendered on the placeholder fallback      | 555                     |
| Files in `public/characters/`             | 221                     |
| Bytes in `public/characters/`             | **53,897,672 (53.9MB)** |
| `public/` total                           | 234,144 KiB             |

Findings:

| Class                | Count | Detail                                                                    |
| -------------------- | ----- | ------------------------------------------------------------------------- |
| Orphan, near miss    | 1     | `vaemond-targaryen.jpg`, 177,612 bytes, matched no slug                   |
| Orphan, no candidate | 1     | `thoros-of-myr.jpg`, 252,988 bytes, no entry and no slug within tolerance |
| Duplicate extensions | 0     |                                                                           |
| Oversized            | 1     | `greatjon-umber.png`, 5,503,748 bytes, 3072x2048                          |
| Off-aspect           | 0     | every file is 1152x768 or 1168x784, both inside 3:2 +/- 0.05              |
| Unreadable headers   | 0     |                                                                           |
| Integrity errors     | 1     | the near miss                                                             |

Two of 221 files, 430,600 bytes, resolved to nothing. Neither produced a visible
error: `findPortrait` falls through to a hashed placeholder, so both characters
rendered a generic face that reads as a deliberate design choice.

## Fixed

### 1. `vaemond-targaryen.jpg` renamed to `vaegon-targaryen.jpg`

Added in #22, never rendered. The audit proposed `vaegon-targaryen`, which the
picture confirms: a pale silver-haired man in grey robes wearing a maester's
chain of many metals. That is Vaegon Targaryen, "The Dragonless", Archmaester
and son of Jaehaerys I. `content/characters/vaegon-targaryen.md` already existed
with no art.

Two other slugs sit closer or nearby in raw edit distance and both are wrong:

| Candidate          | Edit distance | Already has art          |
| ------------------ | ------------- | ------------------------ |
| `aemond-targaryen` | 1             | yes, the one-eyed Aemond |
| `vaegon-targaryen` | 2             | no                       |
| `vaemond-velaryon` | 5             | yes, in Velaryon green   |

This is why `nearestSlug` ranks uncovered slugs ahead of covered ones. A plain
minimum picks `aemond-targaryen` and proposes overwriting good art.

Result: 177,612 bytes of art moved from dead to rendering, coverage 209 to 210.

### 2. `greatjon-umber.png` re-encoded to `greatjon-umber.jpg`

3072x2048 PNG at 5,503,748 bytes, 17x the median portrait and 2.6x the widest
size any view renders. TrueColor, no alpha, so JPEG loses nothing.

```bash
magick public/characters/greatjon-umber.png -filter Lanczos -resize 1152x768 \
  -sampling-factor 2x2,1x1,1x1 -quality 95 -strip \
  public/characters/greatjon-umber.jpg
```

1152x768 at q=95 matches the 171-file convention exactly and lands at 305,305
bytes, inside the 250-330KB band of its siblings. Against a lossless downscale
of the same source the JPEG measures **PSNR 40.3dB, RMSE 0.96%**, so the
compression step is visually lossless; the pixel-art rendering survives intact.
The PNG was deleted only after the JPEG was in place, so the slug never lost
coverage.

The source raster was checked for a hard pixel grid before resizing (an 8x8
sample varies per pixel, no nearest-neighbour blocks), which is what makes a
non-integer 0.375 downscale safe here.

Result: **5,198,443 bytes reclaimed**.

## Left alone, deliberately

| Item                                                   | Why                                                                                                                                                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `thoros-of-myr.jpg` (252,988 bytes)                    | Finished art for a real character with no `content/characters/` entry. Added to `RESERVED_PORTRAITS` with a named follow-up rather than deleted; it resolves the moment the entry is written.                                    |
| 554 uncovered characters                               | Sourcing or generating portrait art is out of scope for this skill. They are ranked by inbound references so the next run can pick targets.                                                                                      |
| The 49 files at 1168x784                               | Inside the 3:2 tolerance (1.490 against 1.500) and inside the size budget. Re-encoding for uniformity alone would churn 49 files for no user-visible gain.                                                                       |
| Converting portraits to WebP                           | `PORTRAIT_EXTENSIONS` already accepts `webp`, so it would work, but every portrait is served through the Netlify Image CDN and re-encoded per request. Repo weight only. Belongs to `image-optimize` if it is ever done in bulk. |
| `public/sigils/`, `public/map/`, the rest of `public/` | Owned by `sigil-audit` and `image-optimize`. Auditing them here would fork the rules.                                                                                                                                            |

Nothing was deleted except `greatjon-umber.png`, and only after its replacement
was on disk. No file was removed on the strength of the orphan check alone.

## After

| Measure                       | Before      | After           |
| ----------------------------- | ----------- | --------------- |
| Rendered with dedicated art   | 209 (27.4%) | **210 (27.5%)** |
| Files in `public/characters/` | 221         | 221             |
| Bytes in `public/characters/` | 53,897,672  | **48,699,229**  |
| `public/` total               | 234,144 KiB | **229,068 KiB** |
| Orphans                       | 2           | 1, reserved     |
| Oversized                     | 1           | **0**           |
| Off-aspect                    | 0           | 0               |
| Duplicates                    | 0           | 0               |
| Integrity errors              | 1           | **0**           |

**Bytes reclaimed: 5,198,443 (5.2MB), 9.6% of `public/characters/`.**

Top uncovered characters by inbound references, as the ranking to work from next:

| #   | Refs | Slug                            | House     |
| --- | ---- | ------------------------------- | --------- |
| 1   | 12   | `alyssa-velaryon`               | velaryon  |
| 2   | 12   | `jason-lannister-son-of-gerold` | lannister |
| 3   | 10   | `beron-stark`                   | stark     |
| 4   | 9    | `mace-tyrell`                   | tyrell    |
| 5   | 8    | `borros-baratheon`              | baratheon |

## Gate

`lib/portrait-integrity.ts` plus `lib/portrait-integrity.test.ts` now fail
`bun run test` on an orphan, a near miss, a duplicate extension, an extension
outside `PORTRAIT_EXTENSIONS`, a missing placeholder variant, or a reservation
whose content entry has since been written. This mirrors how
`lib/sigil-integrity.ts` gates `public/sigils/`.

`lib/portraits.ts` now exports `PORTRAIT_EXTENSIONS`, `PLACEHOLDER_VARIANTS`,
and `PLACEHOLDER_EXTENSION` so the check reads the probe order instead of
restating it.

Verification on the branch: `bun run check` green (665 tests, 0 fail),
`bun run build` green.
