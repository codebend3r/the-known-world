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
