import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./lib/netlify-image-loader.ts",
  },
  trailingSlash: true,
  // Sass prefixes a byte-order mark to compressed output containing non-ASCII
  // characters (`content: "▚"`). Once modules are concatenated into a chunk,
  // that mark lands mid-file and corrupts the next selector, so it is disabled.
  sassOptions: {
    loadPaths: [path.join(__dirname, "styles")],
    charset: false,
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
