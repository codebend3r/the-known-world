export type CdnImageOptions = {
  w?: number;
  h?: number;
  fit?: "contain" | "cover" | "fill";
  position?: "top" | "bottom" | "left" | "right" | "center";
  fm?: "avif" | "jpg" | "png" | "webp" | "gif" | "blurhash";
  q?: number;
};

// In `next dev`, the Netlify Image CDN endpoint is not available, so return the
// raw `src` and let Next serve it from `public/`. The static export bakes this
// call's return value into HTML at build time (NODE_ENV=production), so the
// deployed site — and `netlify dev` serving the built `out/` — both hit the CDN.
export function cdnImage(src: string, options: CdnImageOptions = {}): string {
  if (process.env.NODE_ENV !== "production") {
    return src;
  }
  const params = new URLSearchParams({ url: src });
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return `/.netlify/images?${params.toString()}`;
}
