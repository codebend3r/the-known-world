import { afterEach, describe, expect, it, vi } from "vitest";
import { cdnImage } from "@/lib/cdn-image";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cdnImage", () => {
  it("returns the raw src in development so `next dev` can serve from /public", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(cdnImage("/characters/arya-stark.png", { h: 180, fm: "webp" })).toBe(
      "/characters/arya-stark.png",
    );
  });

  it("emits a /.netlify/images URL with the source path and transform params in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const url = cdnImage("/characters/arya-stark.png", {
      h: 180,
      fm: "webp",
      q: 80,
    });
    const parsed = new URL(url, "https://example.com");
    expect(parsed.pathname).toBe("/.netlify/images");
    expect(parsed.searchParams.get("url")).toBe("/characters/arya-stark.png");
    expect(parsed.searchParams.get("h")).toBe("180");
    expect(parsed.searchParams.get("fm")).toBe("webp");
    expect(parsed.searchParams.get("q")).toBe("80");
  });

  it("omits options that are undefined", () => {
    vi.stubEnv("NODE_ENV", "production");
    const url = cdnImage("/x.png", { h: 100 });
    const parsed = new URL(url, "https://example.com");
    expect(parsed.searchParams.has("w")).toBe(false);
    expect(parsed.searchParams.has("fit")).toBe(false);
  });

  it("accepts external image URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    const url = cdnImage("https://example.com/owl.jpg", { w: 50, h: 50 });
    const parsed = new URL(url, "https://example.com");
    expect(parsed.searchParams.get("url")).toBe("https://example.com/owl.jpg");
  });
});
