import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenu } from "@/components/MainMenu";

describe("MainMenu", () => {
  it("renders only visible tiles in order: Houses, Characters, Weapons, Battles", () => {
    render(<MainMenu />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    expect(links[0].textContent).toContain("Houses");
    expect(links[0].getAttribute("href")).toBe("/houses/");

    expect(links[1].textContent).toContain("Characters");
    expect(links[1].getAttribute("href")).toBe("/characters/");

    expect(links[2].textContent).toContain("Weapons");
    expect(links[2].getAttribute("href")).toBe("/weapons/");

    expect(links[3].textContent).toContain("Battles");
    expect(links[3].getAttribute("href")).toBe("/battles/");
  });

  it("does not render hidden tiles (Maps, Timeline, Dragons)", () => {
    render(<MainMenu />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/maps/");
    expect(hrefs).not.toContain("/timeline/");
    expect(hrefs).not.toContain("/dragons/");
  });

  it("shows no coming-soon pills now that Maps and Timeline are hidden", () => {
    render(<MainMenu />);
    expect(screen.queryAllByText(/coming soon/i)).toHaveLength(0);
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    expect(
      screen.getByRole("navigation", { name: /atlas sections/i }),
    ).toBeDefined();
  });
});
