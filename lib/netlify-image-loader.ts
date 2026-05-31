import type { ImageLoaderProps } from "next/image";

export default function netlifyImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const w = String(width);
  const q = String(quality ?? 75);
  if (process.env.NODE_ENV !== "production") {
    return `${src}?w=${w}&q=${q}`;
  }
  const params = new URLSearchParams({ url: src, w, q });
  return `/.netlify/images?${params.toString()}`;
}
