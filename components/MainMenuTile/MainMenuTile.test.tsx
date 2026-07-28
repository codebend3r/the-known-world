import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MainMenuTile } from "@/components/MainMenuTile";

describe("MainMenuTile", () => {
  it("renders title, subtitle, and glyph inside one link", () => {
    render(
      <MainMenuTile
        title="Map"
        subtitle="Survey the realm."
        glyph={<svg data-testid="glyph" />}
        href="/map/"
      />,
    );

    const link = screen.getByRole("link", { name: /map/i });
    expect(link.getAttribute("href")).toBe("/map/");
    expect(link.textContent).toContain("Map");
    expect(link.textContent).toContain("Survey the realm.");
    expect(screen.getByTestId("glyph")).toBeDefined();
  });
});
