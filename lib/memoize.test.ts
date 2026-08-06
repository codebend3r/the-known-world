import { describe, it, expect } from "bun:test";
import { memoize, memoizeBySlug } from "@/lib/memoize";

describe("memoize", () => {
  it("runs the loader once across repeated calls when enabled", async () => {
    let calls = 0;
    const load = memoize({
      enabled: true,
      load: async () => {
        calls += 1;
        return calls;
      },
    });
    expect(await load()).toBe(1);
    expect(await load()).toBe(1);
    expect(calls).toBe(1);
  });

  it("returns the identical resolved reference on a hit", async () => {
    const value = { name: "House Stark" };
    const load = memoize({ enabled: true, load: async () => value });
    expect(await load()).toBe(await load());
    expect(await load()).toBe(value);
  });

  it("runs the loader on every call when disabled", async () => {
    let calls = 0;
    const load = memoize({
      enabled: false,
      load: async () => {
        calls += 1;
        return calls;
      },
    });
    expect(await load()).toBe(1);
    expect(await load()).toBe(2);
    expect(calls).toBe(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let calls = 0;
    const load = memoize({
      enabled: true,
      load: async () => {
        calls += 1;
        await Promise.resolve();
        return calls;
      },
    });
    expect(await Promise.all([load(), load(), load()])).toEqual([1, 1, 1]);
    expect(calls).toBe(1);
  });

  it("propagates a rejection to the caller", () => {
    const load = memoize({
      enabled: true,
      load: async () => {
        throw new Error("missing frontmatter");
      },
    });
    expect(load()).rejects.toThrow("missing frontmatter");
  });
});

describe("memoizeBySlug", () => {
  it("caches each slug independently", async () => {
    const calls: string[] = [];
    const load = memoizeBySlug({
      enabled: true,
      load: async (slug: string) => {
        calls.push(slug);
        return slug.toUpperCase();
      },
    });
    expect(await load("stark")).toBe("STARK");
    expect(await load("arryn")).toBe("ARRYN");
    expect(await load("stark")).toBe("STARK");
    expect(calls).toEqual(["stark", "arryn"]);
  });

  it("runs the loader on every call when disabled", async () => {
    const calls: string[] = [];
    const load = memoizeBySlug({
      enabled: false,
      load: async (slug: string) => {
        calls.push(slug);
        return slug;
      },
    });
    await load("tully");
    await load("tully");
    expect(calls).toEqual(["tully", "tully"]);
  });

  it("shares one in-flight load per slug between concurrent callers", async () => {
    const calls: string[] = [];
    const load = memoizeBySlug({
      enabled: true,
      load: async (slug: string) => {
        calls.push(slug);
        await Promise.resolve();
        return slug;
      },
    });
    await Promise.all([load("tyrell"), load("tyrell"), load("martell")]);
    expect(calls).toEqual(["tyrell", "martell"]);
  });
});
