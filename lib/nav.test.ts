import fs from "node:fs/promises";
import path from "node:path";
import { describe, it, expect } from "bun:test";
import { isActive, NAV_ITEMS, visibleNavItems } from "@/lib/nav";

async function routeExists(href: string): Promise<boolean> {
  const segment = href.replace(/^\/|\/$/g, "");
  return fs
    .stat(path.join(process.cwd(), "app", segment, "page.tsx"))
    .then(() => true)
    .catch(() => false);
}

// `/events/` shipped 53 detail pages with no index route and no nav entry for
// months, reachable only through inbound prose links. Both halves of that gap
// are asserted here so the next collection cannot repeat it.
describe("NAV_ITEMS", () => {
  it("points every entry at an index route that exists", async () => {
    const checked = await Promise.all(
      NAV_ITEMS.map(async (item) => ({
        href: item.href,
        exists: await routeExists(item.href),
      })),
    );
    expect(checked.filter((item) => !item.exists)).toEqual([]);
  });

  it("lists every browsable section, Events included", () => {
    expect(visibleNavItems().map((item) => item.href)).toEqual([
      "/maps/",
      "/timeline/",
      "/houses/",
      "/castles/",
      "/characters/",
      "/weapons/",
      "/battles/",
      "/events/",
    ]);
  });

  it("keeps Dragons registered but hidden", () => {
    const dragons = NAV_ITEMS.find((item) => item.href === "/dragons/");
    expect(dragons?.visible).toBe(false);
  });
});

describe("isActive", () => {
  it("matches an exact path regardless of a trailing slash on the pathname", () => {
    expect(isActive({ pathname: "/houses/", href: "/houses/" })).toBe(true);
    expect(isActive({ pathname: "/houses", href: "/houses/" })).toBe(true);
  });

  it("matches nested paths under the href prefix", () => {
    expect(isActive({ pathname: "/houses/stark/", href: "/houses/" })).toBe(
      true,
    );
    expect(isActive({ pathname: "/houses/stark", href: "/houses/" })).toBe(
      true,
    );
  });

  it("does not match a sibling section", () => {
    expect(isActive({ pathname: "/characters/", href: "/houses/" })).toBe(
      false,
    );
  });

  it("does not treat a prefix-of-a-segment as active", () => {
    expect(isActive({ pathname: "/houseskeeping/", href: "/houses/" })).toBe(
      false,
    );
  });

  it("returns false when the pathname is null", () => {
    expect(isActive({ pathname: null, href: "/houses/" })).toBe(false);
  });
});
