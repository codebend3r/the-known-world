import { describe, it, expect } from "bun:test";
import { isActive } from "@/lib/nav";

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
