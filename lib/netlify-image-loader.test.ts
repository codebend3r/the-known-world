import { afterEach, describe, expect, it, vi } from "vitest";
import netlifyImageLoader from "@/lib/netlify-image-loader";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("netlifyImageLoader", () => {
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
    ).toBe("/.netlify/images?url=%2Fcharacters%2Feddard-stark.jpg&w=1200&q=75");
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
