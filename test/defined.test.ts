import { describe, it, expect } from "bun:test";
import { expectDefined } from "@/test/defined";

describe("expectDefined", () => {
  it("returns the value when it is present", () => {
    const value = { slug: "stark" };
    expect(expectDefined(value)).toBe(value);
  });

  it("keeps falsy values that are not missing", () => {
    expect(expectDefined(0)).toBe(0);
    expect(expectDefined("")).toBe("");
    expect(expectDefined(false)).toBe(false);
  });

  it("throws when the lookup found nothing", () => {
    expect(() => expectDefined(undefined)).toThrow(
      "expected a value, got undefined",
    );
    expect(() => expectDefined(null)).toThrow("expected a value, got null");
  });
});
