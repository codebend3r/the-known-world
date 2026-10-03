# Portrait hover-video re-encode: Design Spec

**Date:** 2026-10-02
**Status:** Deferred. Specified for later implementation; nothing here has shipped.
**Scope:** every `.mp4` under `public/characters/` (flat files and variant
folders), the `portrait-pipeline` skill, and `lib/portrait-integrity.ts`. No
component changes: `findPortraitVideo` probes `<slug>.mp4` and the files keep
their names.

## Overview

Each character portrait can carry a muted hover loop. `CharacterPortrait`
plays it on `mouseenter` and fades the still away once frames are playing. As
of this date the clip is lazy: `preload="none"`, so nothing downloads until the
first hover. That stops every page view paying for the clip, but the reader who
does hover still downloads a file encoded far heavier than its job needs, and
the clip stalls whenever their connection is slower than its bitrate.

Measured on `main` (2026-10-02):

| Property    | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Files       | 131 `.mp4`, **2.30 GB** total                                         |
| Size        | median **16 MB**, max **50 MB**                                       |
| Video       | H.264 High, `yuv420p`, bt709, 24 fps, **~14–16 Mb/s**                 |
| Dimensions  | 116 × 1728x1152, 9 × 1760x1152, 6 × 1168x768                          |
| Duration    | 70 × 6.04 s, 59 × 10.04 s, 2 × 15.04 s                                |
| Extra audio | AAC-LC 128 kb/s in every file, never heard: the element is `muted`    |
| Extra video | an MJPEG `attached_pic` cover-art stream in every file                |
| Layout      | already faststart (`moov` before `mdat`) in all 131; keep it that way |

At ~15 Mb/s a first hover needs a sustained 15 Mb/s connection to play without
stalling. The recommended encode lands at ~4–8 Mb/s, which halves that and
cuts the download 2–3×.

## Goals

- Every clip re-encoded so a first hover downloads 2–3× less and starts
  playing sooner, with **no visible loss at the size it is shown**.
- Keep native resolution. No downscaling (see Decisions for why).
- Drop the streams the browser never uses: the audio track and the cover art.
- A repeatable, scripted encode step in the `portrait-pipeline` skill, so new
  clips land already encoded rather than being fixed up in a later sweep.
- A CI gate that fails `bun run test` when an un-encoded clip lands.

## Non-goals

- Any change to `CharacterPortrait` playback. Lazy loading already shipped.
- Downscaling clips. Trials show visible loss (below).
- AV1 or HEVC sources with an H.264 fallback. Measured gain over H.264 is
  modest and it doubles the file count. Revisit as a follow-up (see Open
  questions).
- Rewriting git history or moving clips to Git LFS. The old 2.3 GB stays in
  history either way; that is a separate decision.
- Re-cropping the nine 1760x1152 clips to an exact 3:2. The plate already
  crops with `object-fit: cover`.
- Still portraits. They are already served through the Netlify Image CDN.

## Display context (why resolution stays native)

`CharacterPortrait` renders the clip in a 3:2 plate at up to ~1100 CSS px wide
(the still declares `sizes="(max-width: 768px) 100vw, 1100px"`). On a 2×
display that is ~2200 device pixels, so the 1728 px source is already the
limiting factor. Hover is a desktop interaction and most desktop readers are
on high-DPI screens, so every pixel removed is a pixel the reader loses.

## Trial encodes

Two representative clips, encoded with `ffmpeg` 9.0.2 and scored with
`libvmaf` against the current file (each encode is scaled back to 1728x1152
with bicubic before scoring, as a 2× screen would upscale it). Every trial
drops the audio and cover-art streams and writes `+faststart`.

`arya-stark.mp4`: 6 s, 11.7 MB today.

| Encode                    |   Size | vs today | VMAF |
| ------------------------- | -----: | -------: | ---: |
| H.264 1104 px, CRF 26     | 1.1 MB |    0.09× | 77.2 |
| H.264 1280 px, CRF 23     | 2.6 MB |    0.22× | 86.1 |
| H.264 1728 px, CRF 22     | 6.6 MB |    0.56× | 94.8 |
| **H.264 1728 px, CRF 23** | 5.6 MB |    0.48× | 93.7 |
| H.264 1728 px, CRF 24     | 4.8 MB |    0.41× | 92.5 |
| H.264 1728 px, CRF 25     | 4.0 MB |    0.35× | 91.2 |
| AV1 1728 px, CRF 30       | 5.5 MB |    0.47× | 95.0 |
| AV1 1728 px, CRF 34       | 3.8 MB |    0.32× | 93.1 |
| AV1 1728 px, CRF 38       | 2.6 MB |    0.22× | 90.9 |

`arthur-dayne.mp4`: 10 s, 13.9 MB today.

| Encode                    |   Size | vs today | VMAF |
| ------------------------- | -----: | -------: | ---: |
| H.264 1104 px, CRF 26     | 1.2 MB |    0.08× | 79.4 |
| H.264 1280 px, CRF 23     | 2.5 MB |    0.18× | 86.8 |
| H.264 1728 px, CRF 22     | 6.0 MB |    0.43× | 95.6 |
| **H.264 1728 px, CRF 23** | 5.1 MB |    0.37× | 95.0 |
| H.264 1728 px, CRF 24     | 4.3 MB |    0.31× | 94.3 |
| H.264 1728 px, CRF 25     | 3.6 MB |    0.26× | 93.5 |
| AV1 1728 px, CRF 30       | 4.5 MB |    0.32× | 95.7 |
| AV1 1728 px, CRF 34       | 3.0 MB |    0.22× | 94.7 |
| AV1 1728 px, CRF 38       | 2.1 MB |    0.15× | 93.6 |

Reading the numbers:

- **Downscaling is what made the early "27 MB to 1.2 MB" estimate look so
  good, and it is not free.** VMAF 77–87 is visible softening on a 2× screen.
- **At native resolution H.264 CRF 23 saves 2–2.7×** at VMAF 93.7–95.0, and
  CRF 24–25 saves up to ~4× at VMAF 91–94. VMAF ≥ 93 is the usual bar for
  "indistinguishable at normal viewing", so CRF 23 is the starting point.
- **Bitrate varies with content, not duration.** CRF 23 came out at ~7.8 Mb/s
  on the grainier 6 s clip and ~4.2 Mb/s on the 10 s one, so a fixed file-size
  cap would wrongly fail long clips. The CI budget is a bitrate.
- **AV1 buys ~10–25% more** at equal VMAF. That is not enough to justify a
  second file per clip and a `<source>` fallback for Safari on Macs without
  AV1 decode (pre-M3).

## Decisions

| Decision         | Choice                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Codec            | H.264 (`libx264`), High profile, `yuv420p`. Plays everywhere the site does today                                                  |
| Resolution       | Native. No `scale` filter. 1728x1152, 1760x1152, and 1168x768 all stay as they are                                                |
| Rate control     | CRF, **starting at 23**, confirmed by the calibration step below; preset `slow`                                                   |
| Quality bar      | Mean VMAF ≥ 93 over the calibration sample, no single clip below 91                                                               |
| Streams          | `-map 0:v:0` keeps the one real video stream; `-an` drops audio; cover art is dropped by the map                                  |
| Color            | Pass through bt709 tags: `-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`                              |
| Frame rate / GOP | Keep 24 fps. Default GOP; the clip only ever seeks to `0`, which is always a keyframe                                             |
| Container        | MP4 with `-movflags +faststart`, same filename and path as the original                                                           |
| Masters          | Originals stay recoverable from git history at the commit before the swap; record that hash in the skill                          |
| Budget (CI)      | Fail `bun run test` for any clip averaging over **10 Mb/s**: file size ÷ duration. Today's files run 14–16 Mb/s; CRF 23 runs ~4–8 |
| Duration source  | The `mvhd` box, read in TypeScript. Faststart puts `moov` up front, so it is in the first few KB; CI needs no `ffmpeg`            |

The encode, as one command:

```bash
ffmpeg -i <in>.mp4 -map 0:v:0 -an \
  -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -movflags +faststart <out>.mp4
```

## Implementation plan

1. **Encode script.** Add `.claude/skills/portrait-pipeline/encode-portrait-video.ts`.
   - Takes one or more input paths and an output root; mirrors the
     `public/characters/` layout, including variant folders, so the output can
     be copied over the tree as-is.
   - Runs the command above via `Bun.spawn`, never in place.
   - Verifies each output with `ffprobe`: exactly one stream, `h264`, the
     source's width and height, `yuv420p`, `moov` before `mdat`.
   - Prints before and after size per clip; `--vmaf` adds a VMAF score against
     the source.
   - Skips clips already compliant (H.264, no audio, within the bitrate
     budget), so it is safe to re-run.
2. **Calibrate.** Run the script with `--vmaf` on ~10 clips covering all three
   dimensions and all three durations, at CRF 22, 23, and 24. Pick the highest
   CRF that meets the quality bar and record the table in this spec.
3. **Batch.** Encode all 131 into a staging directory outside the repo
   (`~/Downloads/temp/portrait-videos/`). Total and median size go in the PR.
4. **Review.** Hover-test a handful in the browser via `bun dev`. Include the
   2 × 15 s clips, a 1168x768 clip, and a variant (e.g.
   `aegon-ii-targaryen--after-burned`). Check:
   - the loop seam is clean;
   - colors match the still (no washed-out bt601 shift);
   - grain and hair detail hold up on a 2× screen.
5. **Swap.** Copy the staging tree over `public/characters/`. Filenames are
   unchanged, so no code or content edits.
6. **Gate.** Add a bitrate budget to `lib/portrait-integrity.ts`.
   - Size from `fs.stat`. Duration from a small `mvhd` reader: walk the
     top-level boxes from the file start to `moov`, then read `timescale` and
     `duration` (version 0 and 1 layouts).
   - A clip whose `moov` is not ahead of `mdat` is itself an error: it is not
     faststart.
   - Each failing clip becomes an error naming the file and its Mb/s, and
     pointing at the encode script.
   - Cover the reader and the gate in `lib/portrait-integrity.test.ts` with
     small fixture buffers.
7. **Audit.** Add a `VIDEOS` section to `audit-portraits.ts`. Where `ffprobe`
   is available locally, it flags clips that:
   - carry audio or cover-art streams;
   - are not faststart;
   - exceed the bitrate budget.
8. **Docs.** Add a step to the `portrait-pipeline` skill: hover clips go
   through `encode-portrait-video.ts` before they land in `public/`. Note the
   pre-swap commit hash there as the location of the masters.
9. **Verify.**
   - `bun run test`, `bun run build`.
   - Measure total `public/characters/*.mp4` weight against the 2.30 GB
     baseline.
   - Throttle the browser to ~10 Mb/s and confirm a first hover on a 10 s clip
     plays without stalling.

## Acceptance criteria

- All 131 clips:
  - H.264 High, `yuv420p`, bt709-tagged, native resolution, 24 fps;
  - a single video stream: no audio, no cover art;
  - faststart.
- Calibration sample: mean VMAF ≥ 93, minimum ≥ 91.
- Total clip weight cut by at least half: ≤ ~1.1 GB from 2.30 GB. The two
  trial clips project 0.85–1.10 GB at CRF 23.
- No clip averages over 10 Mb/s.
- `bun run test` fails if an over-budget or non-faststart clip is added, and
  passes on the re-encoded tree.
- Hover still swaps cleanly from still to clip and back on the pages checked in
  step 4.

## Open questions

- **Masters.** Is "recoverable from git history" enough, or should originals
  live somewhere outside the repo (e.g. the NAS) so new clips are always
  encoded from a pristine source?
- **History weight.** The swap adds ~0.85–1.1 GB on top of the 2.3 GB already
  in history. Moving clips to Git LFS or rewriting history is a separate,
  hard-to-reverse call.
- **AV1 follow-up.** If clip weight still matters after this, an AV1
  `<source>` ahead of the H.264 one saves another ~10–25% for readers whose
  browsers decode it. Needs a `CharacterPortrait` change and a second file per
  clip.
