import { describe, expect, it, beforeEach } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { SpoilerToggle } from "@/components/SpoilerToggle";
import { SPOILERS_STORAGE_KEY } from "@/lib/spoilers";

describe("SpoilerToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a switch named for what it controls", () => {
    render(<SpoilerToggle />);
    const toggle = screen.getByRole("switch", { name: /spoilers/i });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("flips the switch and stores the choice", () => {
    render(<SpoilerToggle />);
    const toggle = screen.getByRole("switch", { name: /spoilers/i });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(SPOILERS_STORAGE_KEY)).toBe("on");
  });

  it("opens already on when the reader turned it on before", () => {
    window.localStorage.setItem(SPOILERS_STORAGE_KEY, "on");
    render(<SpoilerToggle />);
    expect(
      screen
        .getByRole("switch", { name: /spoilers/i })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("keeps the caller's class alongside its own", () => {
    render(<SpoilerToggle className="header-slot" />);
    const toggle = screen.getByRole("switch", { name: /spoilers/i });
    expect(toggle.className).toContain("header-slot");
    expect(toggle.className).toContain("toggle");
  });
});
