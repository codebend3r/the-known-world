import { describe, it, expect } from "bun:test";
import { exhaustiveList } from "@/lib/exhaustive-list";

type Side = "green" | "black";

describe("exhaustiveList", () => {
  it("returns the list unchanged and in order", () => {
    const sides = exhaustiveList<Side>()(["black", "green"]);
    expect(sides).toEqual(["black", "green"]);
  });

  it("rejects a list that leaves a member out", () => {
    // @ts-expect-error `black` is missing, which is the compile error under test
    const sides = exhaustiveList<Side>()(["green"]);
    expect(sides).toHaveLength(1);
  });

  it("rejects a value outside the union", () => {
    // @ts-expect-error `blue` is not a `Side`, which is the compile error under test
    const sides = exhaustiveList<Side>()(["green", "black", "blue"]);
    expect(sides).toHaveLength(3);
  });
});
