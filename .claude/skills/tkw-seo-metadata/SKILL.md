---
name: tkw-seo-metadata
description: Use when working on discoverability, metadata, or search presentation in this repo. Triggers include "add a sitemap", "robots.txt", "the pages have no OG image", "add structured data", "JSON-LD", "schema.org", "canonical URLs", "social share previews", "why don't pages show up in search", "improve SEO", or adding metadata to a new route or content type.
---

# SEO Metadata

## Overview

This is a 1,697-page static encyclopedia. Every page prerenders to HTML, so search coverage is purely a question of what is in the `<head>`, and the reach ceiling is set entirely by metadata rather than by rendering.

Titles and descriptions are already in place: every index route exports `metadata` and all seven detail routes export `generateMetadata`. Only `app/page.tsx` relies on the layout default. **Do not "add metadata" as though the routes have none.**

What is missing is everything else: no `sitemap.ts`, no `robots.ts`, no `metadataBase`, no canonicals, no Open Graph, no structured data. Confirmed by grep: zero occurrences of `openGraph`, `twitter`, `metadataBase`, or `alternates` anywhere in `app/`.

## The constraint that shapes every recipe here

`next.config.ts` sets `output: "export"` and `trailingSlash: true`. Two consequences drive everything below.

**Metadata routes must opt into static generation explicitly.** A `sitemap.ts` or `robots.ts` without it fails the build:

```
Error: export const dynamic = "force-static"/export const revalidate not configured
on route "/robots.txt" with "output: export".
```

So every metadata route needs:

```ts
export const dynamic = "force-static";
```

This is the single most common way this task fails. Add the line when you create the file, not after the build breaks.

**Every emitted URL needs its trailing slash.** With `trailingSlash: true` the canonical page is `/houses/stark/`. A sitemap listing `/houses/stark` advertises a URL that redirects, which wastes crawl budget and splits signals.

## Sitemap

There is no site URL configured anywhere in the repo. `netlify.toml` sets only `command` and `publish`. Introduce one constant and reuse it; do not scatter literals.

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { loadAllHouses /* ...other loaders */ } from "@/lib/content";

const SITE_URL = "https://atlas.example.com";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const houses = await loadAllHouses();
  // ...load the other six collections in the same Promise.all
  return [
    { url: `${SITE_URL}/` },
    ...houses
      .filter((item) => !item.frontmatter.draft)
      .map((item) => ({ url: `${SITE_URL}/houses/${item.frontmatter.slug}/` })),
    // ...same shape per collection
  ];
}
```

**The `draft` filter is mandatory and must match `generateStaticParams`.** Every detail route filters `!item.frontmatter.draft` before prerendering. A sitemap without that filter lists URLs that were never exported, and every one is a 404 to a crawler.

Verified output: 1,697 `<url>` entries, `out/sitemap.xml` at 125KB, trailing slashes intact.

## Robots

```ts
// app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL = "https://atlas.example.com";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

## metadataBase and canonicals

`metadataBase` goes on the root layout once. It turns every relative `alternates.canonical`, `openGraph.url`, and image path into an absolute URL, which is what crawlers and social scrapers require.

```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Atlas of the Known World · A Song of Ice and Fire",
  description: "...",
  openGraph: {
    type: "website",
    siteName: "Atlas of the Known World",
    images: ["/menu-icons/houses.png"],
  },
};
```

Per detail route, add the canonical with its trailing slash:

```ts
alternates: { canonical: `/houses/${slug}/` },
```

## The Open Graph merge trap

**`openGraph` is replaced wholesale by a child route, not deep-merged.**

Setting `openGraph: { title, description, url }` on a detail route silently drops the layout's `siteName` and `images` for that page. Verified on a real build: a house page with per-page `openGraph` emitted zero `og:image` and zero `og:site_name` tags, while a character page that set none inherited both.

So adding per-page Open Graph naively makes social previews **worse** across 1,600 pages. Either repeat the shared keys in every route, or centralise them:

```ts
// lib/metadata.ts
export function openGraphFor({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) {
  return {
    type: "article" as const,
    siteName: "Atlas of the Known World",
    title,
    description,
    url: path,
    images: [image ?? "/menu-icons/houses.png"],
  };
}
```

A helper is the better answer here: seven routes each hand-repeating `siteName` and a fallback image will drift.

## Structured data

JSON-LD renders straight into the prerendered HTML from a server component. Verified present in `out/houses/stark/index.html` after build.

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: house.frontmatter.name,
  url: `${SITE_URL}/houses/${slug}/`,
  slogan: house.frontmatter.words || undefined,
};

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>;
```

Type per collection:

| Collection       | `@type`        | Useful fields                                                                                    |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| characters       | `Person`       | `name`, `alternateName` from `aliases`, `birthDate`, `deathDate`, `parent`, `spouse`, `children` |
| houses           | `Organization` | `name`, `slogan` from `words`, `location` from `seat`                                            |
| castles          | `Place`        | `name`, `containedInPlace` from `sub-region`                                                     |
| battles, events  | `Event`        | `name`, `startDate`, `endDate`, `location`                                                       |
| weapons, dragons | `Thing`        | `name`, `description`                                                                            |

**In-world dates are not ISO dates.** `DateSchema` is `{ year, era, precision }` where era is `AC`/`BC` and precision may be `legendary`. Do not emit `birthDate: "283 AC"` as though it were a real date. Either omit the date fields or use `description`. A crawler rejecting malformed dates costs more than the field gains.

Only emit JSON-LD for entries with real content. A `placeholder: true` character with an empty body should not advertise itself as a `Person` entity.

## Fix the descriptions while you are here

The existing house description renders a raw slug:

```
<meta name="description" content="The roll of House Stark, seat at winterfell.">
```

`seat` holds a castle slug (`winterfell`), not a display name. That lowercase slug is what shows in search results today. Resolve it through `castlesBySlug` for the display name. Audit the other six routes for the same class of leak before adding anything new.

## Verification

```bash
bun run build
ls out/sitemap.xml out/robots.txt
grep -o '<link rel="canonical"[^>]*>' out/houses/stark/index.html
grep -oE '<meta property="og:[^>]*>' out/houses/stark/index.html
grep -o '<script type="application/ld+json">[^<]*' out/houses/stark/index.html
grep -c "<url>" out/sitemap.xml
```

Check `og:image` and `og:site_name` on a detail page specifically, since the merge trap above is invisible on the home page. Validate structured data against the Rich Results Test before shipping.

## Common mistakes

| Mistake                                                     | Why it goes wrong                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Omitting `export const dynamic = "force-static"`            | The build fails outright under `output: "export"`.                         |
| Sitemap URLs without trailing slashes                       | `trailingSlash: true` makes those redirects, not canonical pages.          |
| Sitemap without the `draft` filter                          | Lists URLs `generateStaticParams` never exported. Every one is a 404.      |
| Adding per-page `openGraph` without `siteName` and `images` | Replaces the layout's object and strips the OG image from those pages.     |
| Claiming the routes have no metadata                        | All indexes and all seven detail routes already set title and description. |
| Emitting in-world years as `birthDate`                      | `283 AC` is not an ISO date and `legendary` precision has no date at all.  |
| Hardcoding the site URL in several files                    | No site URL exists yet. Introduce one constant and import it.              |
