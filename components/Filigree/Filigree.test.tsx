import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FiligreeFlourish, FiligreeRule } from "@/components/Filigree";

describe("Filigree", () => {
  it("renders the flourish as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeFlourish />);
    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("mirrors the flourish when requested", () => {
    const { container } = render(<FiligreeFlourish mirrored />);
    expect(container.querySelector("span")?.className).toMatch(/mirrored/);
  });

  it("renders the rule as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeRule />);
    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
