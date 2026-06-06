import { describe, it, expect, vi } from "vitest";
import { enrichTreeWithPortraits } from "@/lib/family-tree-portraits";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

function spouse(overrides: Partial<TreeSpouse> = {}): TreeSpouse {
  return {
    slug: null,
    name: "Spouse",
    alias: null,
    sex: null,
    placeholder: false,
    inHouse: false,
    titles: [],
    ...overrides,
  };
}

function node(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    slug: "person",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    born: null,
    died: null,
    titles: [],
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe("enrichTreeWithPortraits", () => {
  it("calls findPortrait for in-house, non-placeholder persons", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "eddard",
        name: "Eddard",
        sex: "m",
        children: [node({ slug: "robb", name: "Robb", sex: "m" })],
      }),
    ];
    const [eddard] = await enrichTreeWithPortraits(tree, find);
    expect(eddard.portrait).toBe("/characters/eddard.png");
    expect(eddard.children[0].portrait).toBe("/characters/robb.png");
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("returns null portrait for placeholder persons without calling findPortrait", async () => {
    const find = vi.fn();
    const tree: TreeNode[] = [
      node({ slug: "unknown", name: "Unknown", placeholder: true }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.portrait).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("returns null portrait for external persons without calling findPortrait", async () => {
    const find = vi.fn();
    const tree: TreeNode[] = [
      node({ slug: "foreign", name: "Foreign", external: true }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.portrait).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("calls findPortrait for any spouse with a valid slug, regardless of house", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "p",
        spouses: [
          spouse({ slug: "in", name: "In", inHouse: true, sex: "f" }),
          spouse({ slug: "out", name: "Out", inHouse: false, sex: "f" }),
        ],
      }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.spouses[0].portrait).toBe("/characters/in.png");
    expect(n.spouses[1].portrait).toBe("/characters/out.png");
    expect(find).toHaveBeenCalledWith("in", "f");
    expect(find).toHaveBeenCalledWith("out", "f");
  });

  it("returns null portrait for a spouse with no slug (unnamed)", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "p",
        spouses: [spouse({ slug: null, name: "Mystery", inHouse: false })],
      }),
    ];
    const [n] = await enrichTreeWithPortraits(tree, find);
    expect(n.spouses[0].portrait).toBeNull();
  });

  it("memoizes per-slug so duplicate slugs hit findPortrait once", async () => {
    const find = vi.fn(async (slug: string) => `/characters/${slug}.png`);
    const tree: TreeNode[] = [
      node({
        slug: "p",
        children: [
          node({ slug: "shared", name: "Shared", sex: "f" }),
          node({ slug: "shared", name: "Shared", sex: "f" }),
        ],
      }),
    ];
    await enrichTreeWithPortraits(tree, find);
    const sharedCalls = find.mock.calls.filter((c) => c[0] === "shared");
    expect(sharedCalls.length).toBe(1);
  });
});
