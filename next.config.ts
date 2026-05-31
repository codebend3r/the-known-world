import path from "node:path";
import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  sassOptions: {
    loadPaths: [path.join(process.cwd(), "styles")],
  },
};

export default nextConfig;
