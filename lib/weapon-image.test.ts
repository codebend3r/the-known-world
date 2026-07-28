import { describe, it, expect, spyOn, beforeEach, afterAll } from "bun:test";
import fs from "node:fs/promises";
import { findWeaponImage } from "@/lib/weapon-image";

// `mock.module` would replace `node:fs/promises` wholesale; spying on the one
// method that matters leaves the rest of the module intact.
const access = spyOn(fs, "access");

afterAll(() => {
  access.mockRestore();
});

function existing(paths: string[]) {
  const set = new Set(paths);
  access.mockImplementation((p) => {
    return set.has(String(p))
      ? Promise.resolve()
      : Promise.reject(new Error("ENOENT"));
  });
}

describe("findWeaponImage", () => {
  beforeEach(() => {
    access.mockReset();
  });

  it("returns the `.jpg` path when the image exists", async () => {
    existing([`${process.cwd()}/public/weapons/longclaw.jpg`]);
    const result = await findWeaponImage("longclaw");
    expect(result).toBe("/weapons/longclaw.jpg");
  });

  it("prefers `.png` over `.webp`/`.jpg`/`.jpeg` when several exist", async () => {
    existing([
      `${process.cwd()}/public/weapons/ice.png`,
      `${process.cwd()}/public/weapons/ice.webp`,
      `${process.cwd()}/public/weapons/ice.jpg`,
    ]);
    const result = await findWeaponImage("ice");
    expect(result).toBe("/weapons/ice.png");
  });

  it("falls through extensions in order: png → webp → jpg → jpeg", async () => {
    existing([`${process.cwd()}/public/weapons/dawn.jpeg`]);
    const result = await findWeaponImage("dawn");
    expect(result).toBe("/weapons/dawn.jpeg");
  });

  it("returns null when no image exists for the slug", async () => {
    existing([]);
    const result = await findWeaponImage("lightbringer");
    expect(result).toBeNull();
  });
});
