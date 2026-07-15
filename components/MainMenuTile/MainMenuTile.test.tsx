import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenuTile } from "@/components/MainMenuTile";

describe("MainMenuTile", () => {
  it("renders plate numeral, title, subtitle, and glyph inside one link", () => {
    render(
      <MainMenuTile
        plate="I"
        title="Map"
        subtitle="Survey the realm."
        glyph={<svg data-testid="glyph" />}
        href="/map/"
      />,
    );

    const link = screen.getByRole("link", { name: /map/i });
    expect(link.getAttribute("href")).toBe("/map/");
    expect(link.textContent).toContain("PlateI");
    expect(link.textContent).toContain("Map");
    expect(link.textContent).toContain("Survey the realm.");
    expect(screen.getByTestId("glyph")).toBeDefined();
  });

  it("renders nothing when not visible", () => {
    render(
      <MainMenuTile
        plate="VII"
        title="Dragons"
        subtitle="Wake the dragon."
        glyph={<svg />}
        href="/dragons/"
        visible={false}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
  });
});
