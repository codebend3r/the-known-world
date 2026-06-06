import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./lib/netlify-image-loader.ts",
  },
  trailingSlash: true,
  sassOptions: {
    loadPaths: [path.join(__dirname, "styles")],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
