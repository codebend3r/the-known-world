import { describe, it, expect } from "bun:test";
import { expectElement } from "@/test/dom";

describe("expectElement", () => {
  it("returns the element when it is an instance of the requested type", () => {
    const input = document.createElement("input");
    const narrowed = expectElement({ element: input, type: HTMLInputElement });
    expect(narrowed).toBe(input);
    expect(narrowed.value).toBe("");
  });

  it("accepts an element whose type is a subclass of the requested one", () => {
    const select = document.createElement("select");
    expect(expectElement({ element: select, type: HTMLElement })).toBe(select);
  });

  it("narrows SVG elements too", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    expect(expectElement({ element: g, type: SVGGElement })).toBe(g);
  });

  it("throws, naming both sides, when the element is of another type", () => {
    const div = document.createElement("div");
    expect(() =>
      expectElement({ element: div, type: HTMLInputElement }),
    ).toThrow("expected HTMLInputElement, got <div>");
  });

  it("throws when the query found nothing", () => {
    expect(() =>
      expectElement({ element: null, type: HTMLButtonElement }),
    ).toThrow("expected HTMLButtonElement, got null");
  });
});
