import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenu } from "@/components/MainMenu";

describe("MainMenu", () => {
  it("renders only visible entries in plate order: Maps, Houses, Characters, Timeline, Battles, Weapons", () => {
    render(<MainMenu />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);

    expect(links[0].textContent).toContain("Maps");
    expect(links[0].getAttribute("href")).toBe("/maps/");

    expect(links[1].textContent).toContain("Houses");
    expect(links[1].getAttribute("href")).toBe("/houses/");

    expect(links[2].textContent).toContain("Characters");
    expect(links[2].getAttribute("href")).toBe("/characters/");

    expect(links[3].textContent).toContain("Timeline");
    expect(links[3].getAttribute("href")).toBe("/timeline/");

    expect(links[4].textContent).toContain("Battles");
    expect(links[4].getAttribute("href")).toBe("/battles/");

    expect(links[5].textContent).toContain("Weapons");
    expect(links[5].getAttribute("href")).toBe("/weapons/");
  });

  it("numbers the visible entries as plates I through VI", () => {
    render(<MainMenu />);
    const links = screen.getAllByRole("link");
    const numerals = ["I", "II", "III", "IV", "V", "VI"];
    links.reduce((expected, link) => {
      expect(link.textContent).toContain(`Plate${expected[0]}`);
      return expected.slice(1);
    }, numerals);
  });

  it("does not render hidden entries (Dragons)", () => {
    render(<MainMenu />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/dragons/");
  });

  it('wraps entries in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    expect(
      screen.getByRole("navigation", { name: /atlas sections/i }),
    ).toBeDefined();
  });
});
