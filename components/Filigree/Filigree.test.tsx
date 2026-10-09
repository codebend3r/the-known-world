import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  FILIGREE_VARIANTS,
  FiligreeFlourish,
  FiligreeRule,
} from "@/components/Filigree";

describe("Filigree", () => {
  it("renders the flourish as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeFlourish />);
    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden") ?? null).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("mirrors the flourish when requested", () => {
    const { container } = render(<FiligreeFlourish isMirrored />);
    expect(container.querySelector("span")?.className ?? "").toMatch(
      /mirrored/,
    );
  });

  it("renders the rule as decorative (aria-hidden) svg", () => {
    const { container } = render(<FiligreeRule />);
    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden") ?? null).toBe("true");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a mark for every variant", () => {
    FILIGREE_VARIANTS.forEach((variant) => {
      const { container, unmount } = render(<FiligreeRule variant={variant} />);
      expect(container.querySelector("span")?.className ?? "").toContain(
        variant,
      );
      expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
      unmount();
    });
  });

  it("fades the rule at its end by default", () => {
    const { container } = render(<FiligreeRule />);
    expect(container.querySelector("span")?.className ?? "").toMatch(/fadeEnd/);
  });

  it("fades both ends when asked", () => {
    const { container } = render(<FiligreeRule fade="both" />);
    expect(container.querySelector("span")?.className ?? "").toMatch(
      /fadeBoth/,
    );
  });

  it("closes a capped variant on end caps instead of a fade", () => {
    const { container } = render(
      <FiligreeRule variant="lozenge" fade="both" />,
    );
    expect(container.querySelectorAll("svg").length).toBe(3);
    expect(container.querySelector("span")?.className ?? null).not.toMatch(
      /fade/,
    );
  });
});
