# next/image + Netlify Image CDN migration

## Goal

Render every image on the site through `next/image`, with a custom loader that routes srcset entries through the Netlify Image CDN. Eliminate plain `<img>` tags and CSS `background-image` for content images. Get real responsive `srcset`/`sizes`, native lazy-loading, automatic AVIF/WebP negotiation, and zero hand-rolled CDN URL construction.

## Non-goals

- Routing the Next.js App Router metadata icons (`app/icon.png`, `app/apple-icon.png`) through `<Image>`. Those are a separate file-convention API, not React components.
- Deleting orphaned `/public/logo.png`, `/public/icon-192.png`, `/public/icon-512.png`. Untouched in this migration.
- Storing per-portrait or per-sigil intrinsic dimensions in frontmatter. Acceptable for now to pass aspect-ratio hints to `<Image>` and accept minor CLS on first paint when a portrait's true ratio differs.
- Backporting Dolby-Vision-style AVIF feature detection. Format selection is delegated to the Netlify Image CDN's `Accept`-header content negotiation.
- Slicing the legacy sprite sheet `public/sprites/house-sigils-001.png`. The component's own SCSS comment confirms no house renders from it; we drop it.

## Design summary

A new `lib/netlify-image-loader.ts` implements `next/image`'s custom-loader signature. `next.config.ts` swaps `images.unoptimized: true` for `images.loader: 'custom'` + `images.loaderFile`. Three rendered images (character detail portrait, character list thumbnail, Sigil) move to `<Image>`. `lib/cdn-image.ts` and its only two call sites collapse away — the loader does the URL transform automatically.

## Decisions

| Decision                   | Choice                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Loader location            | `lib/netlify-image-loader.ts`, default-exported function matching `ImageLoaderProps`                 |
| Dev behavior               | Loader returns `src` unmodified when `NODE_ENV !== 'production'` so `bun dev` serves from `/public/` |
| Format                     | Omit `fm=` — Netlify content-negotiates per request `Accept` header (AVIF / WebP / original)         |
| Quality default            | `q=75` (matches `next/image`'s default; current `q=80` was arbitrary)                                |
| `next.config.ts` images    | `{ loader: 'custom', loaderFile: './lib/netlify-image-loader.ts' }`, drop `unoptimized: true`        |
| `output: 'export'`         | Unchanged. Custom loader works under static export — loader-produced URLs bake into HTML at build    |
| Sigil sizing API           | Keep `--sigil-size` rem-string prop. Wrapper `<span>` sized via CSS variable; `<Image fill>` inside  |
| Sigil src resolution       | Component-side `sigilFile()` helper, replacing the SCSS `@each` loops and class-based dispatch       |
| Sigil sprite sheet         | Deleted from SCSS and from `public/sprites/` (no current renderer uses it)                           |
| Character detail dims      | `width={1200} height={1600}` as 3:4 aspect-ratio hint. CSS `width: 100%; height: auto` rules render  |
| Character detail loading   | `priority` (above-the-fold, LCP-eligible)                                                            |
| List thumbnail dims        | `width={270} height={180}` (matches current fixed render size). No `priority`.                       |
| `cdnImage()` helper        | Deleted; loader subsumes it                                                                          |
| Orphan icons in `/public/` | Untouched in this migration                                                                          |

## Component-by-component changes

### `lib/netlify-image-loader.ts` (new)

```ts
import type { ImageLoaderProps } from "next/image";

export default function netlifyImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (process.env.NODE_ENV !== "production") return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
  });
  return `/.netlify/images?${params.toString()}`;
}
```

### `next.config.ts` (edit)

```ts
const nextConfig: NextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./lib/netlify-image-loader.ts",
  },
  trailingSlash: true,
  reactStrictMode: true,
  sassOptions: {
    /* unchanged */
  },
};
```

### `components/Sigil.tsx` (rewrite)

Two small constants replace the SCSS `@each` loops; one helper picks the file:

```ts
const REGION_FILE: Record<string, string> = {
  north: "the-north",
  vale: "the-vale",
  riverlands: "the-riverlands",
  westerlands: "westerlands",
  reach: "the-reach",
  stormlands: "stormlands",
  dorne: "dorne",
  "iron-islands": "iron-islands",
  crownlands: "crownlands",
};

const SLUG_ALIASES: Record<string, string> = {
  durrandon: "baratheon", // crowned stag, inherited by House Baratheon
};

function sigilFile({
  slug,
  region,
}: {
  slug: string;
  region?: string | null;
}): string {
  if (SIGIL_SLUGS.has(slug)) return SLUG_ALIASES[slug] ?? slug;
  if (region && REGION_FILE[region]) return REGION_FILE[region];
  return "unknown";
}
```

Render:

```tsx
return (
  <span
    className={cx(styles.sigil, className)}
    style={size ? ({ "--sigil-size": size } as CSSProperties) : undefined}
    aria-hidden={decorative || undefined}
  >
    <Image
      src={`/sigils/${sigilFile({ slug, region })}.png`}
      alt={decorative ? "" : `Sigil of House ${name}`}
      fill
      sizes={size ?? "6rem"}
    />
  </span>
);
```

Removed: `REGION_CLASS` constant, `variantClass` selection, wrapper `role`. Semantics now live on `<Image alt>`; wrapper keeps `aria-hidden` for decorative cases.

### `components/Sigil.module.scss` (rewrite)

The current 134-line file collapses to a positioned shell:

```scss
.sigil {
  --sigil-size: 6rem;
  position: relative;
  width: var(--sigil-size);
  height: var(--sigil-size);
}
```

Deleted: the base sprite-sheet `background-image` rule, the `--sigil-h` / `--col` / `--row` variables, the `standalone-sigil` mixin, the per-house `@each` loop, the region-fallback `@each` loop, the `.durrandon` alias rule, the `.unknown` rule.

### `components/FilteredCharacterList.tsx` (edit)

```tsx
<Image src={item.portrait} alt="" width={270} height={180} sizes="270px" />
```

Drops `loading="lazy"`, `decoding="async"`, and the eslint-disable. `next/image` defaults both.

### `app/characters/page.tsx` (edit)

```ts
portrait: portraits[i], // was: cdnImage(portraits[i], { h: 180, fm: "webp", q: 80 })
```

Drop the `cdnImage` import.

### `app/characters/[slug]/page.tsx` (edit)

```tsx
<div className={styles.portrait}>
  <Image
    src={portrait}
    alt={`Portrait of ${fm.name}`}
    width={1200}
    height={1600}
    sizes="(max-width: 768px) 100vw, 600px"
    priority
  />
</div>
```

Drop the `cdnImage` import and the eslint-disable.

### `lib/cdn-image.ts` + `lib/cdn-image.test.ts` (delete)

No remaining consumers after the two call-site edits above.

### `public/sprites/house-sigils-001.png` (delete)

Unreferenced after the Sigil SCSS rewrite. (`house-sigils-002.png` and `castles-001.png` are untouched — separate sprite sheets not used by the Sigil component.)

## Data flow

For `<Image src="/sigils/stark.png" />`:

- **`bun dev`** — loader returns `/sigils/stark.png`. Browser fetches `/sigils/stark.png` directly. No CDN involvement; no resizing.
- **`bun run build` (static export)** — Next bakes HTML containing:
  ```html
  <img
    srcset="
      /.netlify/images?url=/sigils/stark.png&w=640&q=75 640w,
      /.netlify/images?url=/sigils/stark.png&w=750&q=75 750w,
      ...
    "
    src="/.netlify/images?url=/sigils/stark.png&w=1920&q=75"
    sizes="6rem"
    alt="Sigil of House Stark"
    loading="lazy"
    decoding="async"
  />
  ```
- **Deployed** — browser picks one srcset entry per its viewport, requests it from Netlify. Netlify's `/.netlify/images` endpoint reads the original from `/public/sigils/stark.png`, resizes to `w`, reformats per `Accept` header, and serves with appropriate cache headers.
- **`netlify dev`** serving the built `out/` directory behaves like production.

## Testing surface

`lib/netlify-image-loader.test.ts` — new, pure unit:

- Production: builds `/.netlify/images?url=...&w=...&q=...` with the input `src`, `width`, and `quality`.
- Production with `quality` omitted: defaults to `q=75`.
- Development (`NODE_ENV !== 'production'`): returns `src` verbatim, regardless of `width`/`quality`.
- Special characters in `src` (e.g., spaces, query strings) are URL-encoded once via `URLSearchParams`.

Existing component tests:

- `next/image` renders as `<img>` in jsdom with extra style attributes; most assertions should still pass.
- `components/Sigil.test.tsx` (if it exists) — DOM shape changes from empty `<span>` to `<span><img/></span>`. Update class-based assertions to query the rendered `<img>` instead. Remove assertions tied to the deleted `regionNorth` / `unknown` / `stark` style classes.
- `components/FilteredCharacterList.test.tsx` (if it exists) — verify the rendered `<img>` carries the expected `alt=""`, `width`, `height`.

All tests run under the existing jsdom vitest config via `bun run test`.

## Commits

Per `CLAUDE.md`, one commit per logical change with the `TKW:` subject prefix:

1. `TKW: add Netlify image loader for next/image` — `lib/netlify-image-loader.ts` + test + `next.config.ts` swap.
2. `TKW: render character list thumbnails with next/image` — `FilteredCharacterList.tsx` + `app/characters/page.tsx`.
3. `TKW: render character detail portrait with next/image` — `app/characters/[slug]/page.tsx`.
4. `TKW: render house sigils with next/image` — `Sigil.tsx` + `Sigil.module.scss` + delete `public/sprites/house-sigils-001.png`.
5. `TKW: drop unused cdnImage helper` — `lib/cdn-image.ts` + test deletion.

Each commit runs `bun run test` (and where touched, `bun run lint` + `bun run build` smoke check) before landing.

## Risks + mitigations

- **`output: 'export'` with custom loader.** Next.js documents this combination as supported; the static export bakes loader-produced URLs into HTML. Smoke-test by running `bun run build` after the config swap and grepping `out/` for `/.netlify/images?` to confirm srcset URLs were emitted.
- **`bun dev` shows un-optimized images.** Intentional. The `/.netlify/images` endpoint only exists on deployed Netlify (or `netlify dev` serving `out/`). Loader's `NODE_ENV` guard preserves the existing developer ergonomics.
- **Sigil layout regressions.** The wrapper `<span>` keeps the same outer dimensions via `--sigil-size`; `<Image fill>` stretches to fit. Verify visually on the houses index, character detail page, and character list — pixels should not move.
- **Character detail CLS.** With a static `1200×1600` hint and `width: 100%; height: auto` CSS, an image whose true aspect ratio differs (e.g., 4:5 instead of 3:4) will reflow once loaded. Accepted as a known minor issue rather than backfilling per-image dimensions. If observed problematic, fix by adding `aspect-ratio: 3 / 4` to `.portrait img` so the placeholder reserves the correct height.
- **`q=75` vs current `q=80`.** Slightly lower visual quality, slightly smaller files. Imperceptible in practice on portraits and sigils at typical screen sizes; matches Next.js default.
- **Netlify Image CDN per-month transformation budget.** Each unique `url + w + q` combination counts as a transformation; results are cached at the CDN. The fixed sigil filenames + small breakpoint set means a bounded transformation cache. Not expected to be material at this site's traffic.
