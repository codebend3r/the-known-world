import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  FILIGREE_VARIANTS,
  FiligreeFlourish,
  FiligreeRule,
} from "@/components/Filigree";
import { expectElement } from "@/test/dom";

function ruleSpan(container: HTMLElement): HTMLElement {
  return expectElement({
    element: container.querySelector("span"),
    type: HTMLElement,
  });
}

describe("Filigree", () => {
  it("renders the flourish as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeFlourish />);
    expect(ruleSpan(container).getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("mirrors the flourish when requested", () => {
    const { container } = render(<FiligreeFlourish isMirrored />);
    expect(ruleSpan(container).className).toMatch(/mirrored/);
  });

  it("renders the rule as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeRule />);
    expect(ruleSpan(container).getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a mark for every variant", () => {
    FILIGREE_VARIANTS.forEach((variant) => {
      const { container, unmount } = render(<FiligreeRule variant={variant} />);
      expect(ruleSpan(container).className).toContain(variant);
      expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
      unmount();
    });
  });

  it("fades the rule at its end by default", () => {
    const { container } = render(<FiligreeRule />);
    expect(ruleSpan(container).className).toMatch(/fadeEnd/);
  });

  it("fades both ends when asked", () => {
    const { container } = render(<FiligreeRule fade="both" />);
    expect(ruleSpan(container).className).toMatch(/fadeBoth/);
  });

  it("closes a capped variant on end caps instead of a fade", () => {
    const { container } = render(
      <FiligreeRule variant="lozenge" fade="both" />,
    );
    expect(container.querySelectorAll("svg").length).toBe(3);
    expect(ruleSpan(container).className).not.toMatch(/fade/);
  });
});
