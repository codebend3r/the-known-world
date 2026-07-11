import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenu } from "@/components/MainMenu";

describe("MainMenu", () => {
  it("renders only visible tiles in order: Maps, Timeline, Houses, Characters, Weapons, Battles", () => {
    render(<MainMenu />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);

    expect(links[0].textContent).toContain("Maps");
    expect(links[0].getAttribute("href")).toBe("/maps/");

    expect(links[1].textContent).toContain("Timeline");
    expect(links[1].getAttribute("href")).toBe("/timeline/");

    expect(links[2].textContent).toContain("Houses");
    expect(links[2].getAttribute("href")).toBe("/houses/");

    expect(links[3].textContent).toContain("Characters");
    expect(links[3].getAttribute("href")).toBe("/characters/");

    expect(links[4].textContent).toContain("Weapons");
    expect(links[4].getAttribute("href")).toBe("/weapons/");

    expect(links[5].textContent).toContain("Battles");
    expect(links[5].getAttribute("href")).toBe("/battles/");
  });

  it("does not render hidden tiles (Dragons)", () => {
    render(<MainMenu />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/dragons/");
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    expect(
      screen.getByRole("navigation", { name: /atlas sections/i }),
    ).toBeDefined();
  });
});
