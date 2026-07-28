import { afterEach, describe, expect, it } from "bun:test";
import { stubEnv, unstubAllEnvs } from "@/test/stubs";
import netlifyImageLoader from "@/lib/netlify-image-loader";

afterEach(() => {
  unstubAllEnvs();
});

describe("netlifyImageLoader", () => {
  it("appends width and quality to src in development", () => {
    stubEnv({ name: "NODE_ENV", value: "development" });
    expect(
      netlifyImageLoader({
        src: "/sigils/stark.png",
        width: 640,
        quality: 80,
      }),
    ).toBe("/sigils/stark.png?w=640&q=80");
  });

  it("rewrites to /.netlify/images in production", () => {
    stubEnv({ name: "NODE_ENV", value: "production" });
    expect(
      netlifyImageLoader({
        src: "/sigils/stark.png",
        width: 640,
        quality: 80,
      }),
    ).toBe("/.netlify/images?url=%2Fsigils%2Fstark.png&w=640&q=80");
  });

  it("defaults quality to 75 when undefined", () => {
    stubEnv({ name: "NODE_ENV", value: "production" });
    expect(
      netlifyImageLoader({
        src: "/characters/eddard-stark.jpg",
        width: 1200,
      }),
    ).toBe("/.netlify/images?url=%2Fcharacters%2Feddard-stark.jpg&w=1200&q=75");
  });

  it("URL-encodes special characters in src", () => {
    stubEnv({ name: "NODE_ENV", value: "production" });
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
