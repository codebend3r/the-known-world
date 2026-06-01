# next/image + Netlify Image CDN Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every rendered image on the site from plain `<img>` and CSS `background-image` to `next/image`, with a custom loader that routes srcset entries through the Netlify Image CDN.

**Architecture:** New `lib/netlify-image-loader.ts` plugs into `next/image` via `next.config.ts`'s `loader: 'custom'` + `loaderFile`. In production the loader rewrites `src` to `/.netlify/images?url=…&w=…&q=…`; in dev it returns `src` verbatim. Three rendered images move to `<Image>`: the character detail portrait (`<Image priority>` with aspect-ratio hint), the character list thumbnail (fixed `width`/`height`), and the `Sigil` component (`<Image fill>` inside a wrapper `<span>` sized by `--sigil-size`). The legacy sprite sheet and `lib/cdn-image.ts` helper collapse away.

**Tech Stack:** Next.js 16 App Router (`output: 'export'`), React 19, TypeScript 5, Vitest 4 + jsdom + `@testing-library/react`, Bun for scripts. Deployment: Netlify static export with `/.netlify/images` transform endpoint.

**Spec:** `docs/superpowers/specs/2026-05-31-next-image-netlify-cdn-migration-design.md`

## Conventions reminder

- Commit subjects start with `TKW:` (see `tkw-commit-format` skill); no `Co-Authored-By` trailer, no AI attribution anywhere in commit messages.
- Run `bun run test` before each commit (this invokes `vitest run` — `bun test` uses Bun's built-in runner and is incompatible with the repo's jsdom setup).
- All in-repo imports use the `@/` alias.

## File map

**Created:**

- `lib/netlify-image-loader.ts` — `next/image` custom loader.
- `lib/netlify-image-loader.test.ts` — unit tests.

**Modified:**

- `next.config.ts` — swap `images.unoptimized` for `images.loader` + `images.loaderFile`.
- `components/Sigil.tsx` — render `<Image fill>`; add `sigilFile()` helper; drop region/variant class dispatch.
- `components/Sigil.module.scss` — collapse to a positioned shell.
- `components/Sigil.test.tsx` (if present) — update DOM-shape assertions.
- `components/FilteredCharacterList.tsx` — `<img>` → `<Image>`.
- `components/FilteredCharacterList.test.tsx` (if present) — update assertions if they touched the `<img>` shape.
- `app/characters/page.tsx` — drop `cdnImage()` wrap.
- `app/characters/[slug]/page.tsx` — `<img>` → `<Image priority>`.

**Deleted:**

- `lib/cdn-image.ts` — no remaining consumers.
- `lib/cdn-image.test.ts` (if present).
- `public/sprites/house-sigils-001.png` — unused after Sigil SCSS rewrite.

---

### Task 1: Add Netlify image loader + swap `next.config.ts`

**Files:**

- Create: `lib/netlify-image-loader.ts`
- Create: `lib/netlify-image-loader.test.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing loader tests**

  Create `lib/netlify-image-loader.test.ts`:

  ```ts
  import { describe, expect, it, vi, afterEach } from "vitest";
  import netlifyImageLoader from "@/lib/netlify-image-loader";

  describe("netlifyImageLoader", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns src verbatim in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(
        netlifyImageLoader({
          src: "/sigils/stark.png",
          width: 640,
          quality: 80,
        }),
      ).toBe("/sigils/stark.png");
    });

    it("rewrites to /.netlify/images in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(
        netlifyImageLoader({
          src: "/sigils/stark.png",
          width: 640,
          quality: 80,
        }),
      ).toBe("/.netlify/images?url=%2Fsigils%2Fstark.png&w=640&q=80");
    });

    it("defaults quality to 75 when undefined", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(
        netlifyImageLoader({
          src: "/characters/eddard-stark.jpg",
          width: 1200,
        }),
      ).toBe(
        "/.netlify/images?url=%2Fcharacters%2Feddard-stark.jpg&w=1200&q=75",
      );
    });

    it("URL-encodes special characters in src", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(
        netlifyImageLoader({
          src: "/characters/needs encoding.png",
          width: 320,
          quality: 70,
        }),
      ).toBe(
        "/.netlify/images?url=%2Fcharacters%2Fneeds+encoding.png&w=320&q=70",
      );
    });
  });
  ```

  Run `bun run test lib/netlify-image-loader.test.ts` and confirm the loader file's absence causes failure.

- [ ] **Step 2: Implement the loader**

  Create `lib/netlify-image-loader.ts`:

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

  Re-run the loader tests — all four should pass.

- [ ] **Step 3: Swap `next.config.ts`**

  Replace the `images` field:

  ```ts
  // Before:
  images: { unoptimized: true },

  // After:
  images: {
    loader: "custom",
    loaderFile: "./lib/netlify-image-loader.ts",
  },
  ```

  Leave `output: "export"`, `trailingSlash: true`, `reactStrictMode: true`, and `sassOptions` untouched.

- [ ] **Step 4: Run full test suite**

  Run `bun run test`. The site still uses `<img>`/`background-image` everywhere, so nothing else in jsdom should change. Confirm green.

- [ ] **Step 5: Commit**

  ```
  TKW: add Netlify image loader for `next/image`

  - new `lib/netlify-image-loader.ts` matches `ImageLoaderProps`
  - `next.config.ts` swaps `unoptimized` for `loader: 'custom'` + `loaderFile`
  - dev returns raw `src`; prod emits `/.netlify/images?url=...&w=...&q=...`
  - format omitted; Netlify content-negotiates per `Accept`
  - quality defaults to `75`
  ```

---

### Task 2: Migrate character list thumbnail to `next/image`

**Files:**

- Modify: `components/FilteredCharacterList.tsx`
- Modify: `app/characters/page.tsx`
- Modify: `components/FilteredCharacterList.test.tsx` (if present)

- [ ] **Step 1: Update `components/FilteredCharacterList.tsx`**

  Add `import Image from "next/image";` at the top with the other imports.

  Replace the `<img>` block (around line 213):

  ```tsx
  // Before:
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src={item.portrait}
    alt=""
    width={270}
    height={180}
    loading="lazy"
    decoding="async"
  />

  // After:
  <Image
    src={item.portrait}
    alt=""
    width={270}
    height={180}
    sizes="270px"
  />
  ```

  `next/image` defaults `loading="lazy"` and `decoding="async"`, so both can drop. The eslint-disable comment is no longer needed.

- [ ] **Step 2: Drop the `cdnImage()` wrap in `app/characters/page.tsx`**

  ```ts
  // Before (top of file):
  import { cdnImage } from "@/lib/cdn-image";

  // After: remove the import.

  // Before (around line 38):
  portrait: cdnImage(portraits[i], { h: 180, fm: "webp", q: 80 }),

  // After:
  portrait: portraits[i],
  ```

- [ ] **Step 3: Update `components/FilteredCharacterList.test.tsx` if assertions break**

  Inspect the file. If any test queries the rendered `<img>` by structure or attribute, confirm those still pass — `next/image` in jsdom renders as `<img>` but with extra inline `style` attributes (e.g., `color: transparent`). Tests querying by `alt`, `width`, `height`, or `src` should be fine. Update or relax any that assert exact attribute order or absence of style.

- [ ] **Step 4: Run full test suite**

  `bun run test`. Confirm green.

- [ ] **Step 5: Commit**

  ```
  TKW: render character list thumbnails with `next/image`

  - `FilteredCharacterList` uses `<Image>` with fixed `270x180`
  - drops manual `loading` / `decoding` (defaults match)
  - drops `cdnImage()` wrap in `app/characters/page.tsx`
  - loader handles `/.netlify/images?` URL at render time
  ```

---

### Task 3: Migrate character detail portrait to `next/image`

**Files:**

- Modify: `app/characters/[slug]/page.tsx`

- [ ] **Step 1: Update `app/characters/[slug]/page.tsx`**

  Add `import Image from "next/image";` near the top imports.

  Remove `import { cdnImage } from "@/lib/cdn-image";`.

  Replace the `<img>` block (around lines 178–184):

  ```tsx
  // Before:
  <div className={styles.portrait}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={cdnImage(portrait, { w: 1200, fm: "webp", q: 80 })}
      alt={`Portrait of ${fm.name}`}
      loading="lazy"
      decoding="async"
    />
  </div>

  // After:
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

  The `width={1200} height={1600}` values are a 3:4 aspect-ratio hint that informs `srcset` breakpoints; the existing `.portrait img { width: 100%; height: auto }` CSS continues to dictate rendered size. `priority` preloads the portrait since it's above-the-fold and LCP-eligible.

- [ ] **Step 2: Run full test suite**

  `bun run test`. The character detail page test (if any) might assert on `<img alt=...>` — `next/image` renders the same `alt` in jsdom. Confirm green.

- [ ] **Step 3: Smoke check the build**

  Run `bun run build`. Expect a clean static export. Grep `out/characters/eddard-stark/index.html` (or any populated character) for `.netlify/images?url=` to confirm the loader baked srcset URLs into the exported HTML.

- [ ] **Step 4: Commit**

  ```
  TKW: render character detail portrait with `next/image`

  - `<Image priority>` for above-the-fold portrait
  - `width={1200} height={1600}` as aspect-ratio hint; CSS still rules render
  - `sizes` covers narrow vs. wide layouts
  - drops `cdnImage()` wrap; loader handles `/.netlify/images?` URLs
  ```

---

### Task 4: Migrate `Sigil` to `next/image`; simplify SCSS

**Files:**

- Modify: `components/Sigil.tsx`
- Modify: `components/Sigil.module.scss`
- Modify: `components/Sigil.test.tsx` (if present)
- Delete: `public/sprites/house-sigils-001.png`

- [ ] **Step 1: Inspect existing Sigil tests**

  Open `components/Sigil.test.tsx` if it exists. Note which assertions depend on:
  - The empty `<span>` shape (about to gain an `<img>` child)
  - Specific class names like `stark`, `regionNorth`, `unknown` (about to disappear from the SCSS)
  - `role="img"` / `aria-label` on the `<span>` (about to move onto `<Image alt>`)

  Plan minimum-viable rewrites of those assertions to query the rendered `<img>` instead.

- [ ] **Step 2: Rewrite `components/Sigil.tsx`**

  Replace the file with:

  ```tsx
  import type { CSSProperties } from "react";
  import Image from "next/image";
  import { cx } from "@/lib/cx";
  import styles from "@/components/Sigil.module.scss";

  const SIGIL_SLUGS = new Set([
    "stark",
    "lannister",
    "targaryen",
    "baratheon",
    "greyjoy",
    "tully",
    "arryn",
    "martell",
    "tyrell",
    "bolton",
    "frey",
    "mormont",
    "umber",
    "karstark",
    "reed",
    "hightower",
    "velaryon",
    "tarly",
    "blackwood",
    "bracken",
    "dayne",
    "yronwood",
    "royce",
    "corbray",
    "redwyne",
    "florent",
    "rowan",
    "oakheart",
    "mallister",
    "piper",
    "manderly",
    "dustin",
    "ryswell",
    "hornwood",
    "cerwyn",
    "blackfyre",
    "celtigar",
    "chester",
    "crakehall",
    "glover",
    "peake",
    "reyne",
    "selmy",
    "wyl",
    "swann",
    "dondarrion",
    "caron",
    "estermont",
    "grafton",
    "tarth",
    "durrandon",
    "unknown",
  ]);

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
    durrandon: "baratheon",
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

  type Props = {
    slug: string | null;
    name: string;
    region?: string | null;
    size?: string;
    decorative?: boolean;
    className?: string;
  };

  export function Sigil({
    slug,
    name,
    region,
    size,
    decorative = false,
    className,
  }: Props) {
    if (slug === null) return null;

    const style = size
      ? ({ "--sigil-size": size } as CSSProperties)
      : undefined;

    return (
      <span
        className={cx(styles.sigil, className)}
        style={style}
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
  }
  ```

  Removed: `REGION_CLASS`, the `variantClass` selection, the wrapper's `role`/`aria-label` (now carried by `<Image alt>`).

- [ ] **Step 3: Rewrite `components/Sigil.module.scss`**

  Replace the entire file with:

  ```scss
  .sigil {
    --sigil-size: 6rem;
    position: relative;
    width: var(--sigil-size);
    height: var(--sigil-size);
  }
  ```

  Deleted: every `@each` loop, the `standalone-sigil` mixin, the `.durrandon` alias, the `.unknown` rule, the sprite-sheet base `background-image`, the `--sigil-h` / `--col` / `--row` variables.

- [ ] **Step 4: Update or delete `components/Sigil.test.tsx`**

  If the file exists, replace assertions that queried the empty `<span>` or specific variant classes with assertions against the rendered `<img>`:
  - For a known slug: `screen.getByAltText(/Sigil of House Stark/i)` plus `expect(img).toHaveAttribute('src', expect.stringContaining('/sigils/stark.png'))`.
  - For a decorative usage: `screen.getAllByRole('img', { hidden: true })` or query by `alt=""`.
  - For an unknown slug with no region: assert the src contains `/sigils/unknown.png`.
  - For an unknown slug with a region: assert the src contains `/sigils/the-north.png` (or whichever the test seeded).
  - For the alias case: `slug="durrandon"` should resolve to `/sigils/baratheon.png`.
  - For `slug={null}`: component returns `null` — no `<img>` rendered.

  Remove any assertion about `regionNorth`, `unknown`, `stark`, etc. CSS class presence.

- [ ] **Step 5: Delete the orphan sprite sheet**

  `rm public/sprites/house-sigils-001.png`. The Sigil SCSS no longer references it.

- [ ] **Step 6: Run full test suite**

  `bun run test`. All tests should pass, including the rewritten Sigil tests.

- [ ] **Step 7: Smoke check the build**

  `bun run build`. Confirm clean export and that an exported house page (e.g. `out/houses/stark/index.html`) contains `srcset="...&url=%2Fsigils%2Fstark.png..."` baked in.

- [ ] **Step 8: Commit**

  ```
  TKW: render house sigils with `next/image`

  - `Sigil` renders `<Image fill>` inside the existing wrapper span
  - new `sigilFile()` helper handles slug, region fallback, alias, unknown
  - `Sigil.module.scss` collapses to a positioned shell
  - wrapper `--sigil-size` rem API preserved; call sites unchanged
  - deletes unused `public/sprites/house-sigils-001.png`
  ```

---

### Task 5: Delete obsolete `cdnImage` helper

**Files:**

- Delete: `lib/cdn-image.ts`
- Delete: `lib/cdn-image.test.ts` (if present)

- [ ] **Step 1: Verify no remaining references**

  `grep -rn "cdn-image\|cdnImage" .` (excluding `node_modules`, `.next`, `out`, and the spec/plan docs). Expect zero hits in `app/`, `components/`, `lib/`.

- [ ] **Step 2: Delete the files**

  ```
  rm lib/cdn-image.ts
  rm lib/cdn-image.test.ts  # if it exists
  ```

- [ ] **Step 3: Run lint + typecheck + tests**

  `bun run lint && bun run typecheck && bun run test`. All green.

- [ ] **Step 4: Commit**

  ```
  TKW: drop unused `cdnImage` helper

  - `lib/cdn-image.ts` superseded by `lib/netlify-image-loader.ts`
  - call sites already migrated to raw `src` strings
  ```

---

## Out of scope (intentionally untouched)

- `/public/logo.png`, `/public/icon-192.png`, `/public/icon-512.png` — orphans, left for a future cleanup.
- `app/icon.png`, `app/apple-icon.png` — App Router file-convention icons; never go through `<Image>`.
- `public/sprites/house-sigils-002.png`, `public/sprites/castles-001.png` — separate sprite sheets not touched by this migration.

## Done criteria

- Every rendered content image on the site is `next/image`.
- No `<img>` tags remain in `app/` or `components/` (except inside generated HTML from markdown rendering, which is not in scope).
- No CSS `background-image` references a content image (sigil, portrait); only decorative parchment textures.
- `lib/cdn-image.ts` is gone.
- `next.config.ts` uses `loader: 'custom'` + `loaderFile`, no `unoptimized`.
- `bun run build` produces a clean static export with `/.netlify/images?url=...` srcset URLs baked into the HTML.
- `bun run test` is green.
- Five commits land on `main`, each with a `TKW:` subject, in the order listed above.
