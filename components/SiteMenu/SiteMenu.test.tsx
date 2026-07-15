import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteMenu } from "@/components/SiteMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/houses/",
}));

describe("SiteMenu", () => {
  it("renders the trigger collapsed by default", () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole("button", { name: /open menu/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides the nav links from the accessibility tree when closed", () => {
    render(<SiteMenu />);
    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });

  it("reveals only the visible primary nav items in plate order (Maps, Houses, Characters, Timeline, Battles, Weapons) when opened", () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeDefined();

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href") ?? "");
    expect(hrefs).toEqual([
      "/maps/",
      "/houses/",
      "/characters/",
      "/timeline/",
      "/battles/",
      "/weapons/",
    ]);
    expect(links.map((l) => l.textContent?.trim())).toEqual([
      "Maps",
      "Houses",
      "Characters",
      "Timeline",
      "Battles",
      "Weapons",
    ]);
  });

  it("does not render hidden items (Dragons)", () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href") ?? "");
    expect(hrefs).not.toContain("/dragons/");
  });

  it('marks the current section with aria-current="page"', () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const housesLink = screen.getByRole("link", { name: /houses/i });
    expect(housesLink.getAttribute("aria-current")).toBe("page");

    const weaponsLink = screen.getByRole("link", { name: /weapons/i });
    expect(weaponsLink.getAttribute("aria-current")).toBeNull();
  });

  it('flips the trigger to aria-expanded="true" while open', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes when the Escape key is pressed", () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when a nav link is activated", () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);

    const weaponsLink = screen.getByRole("link", { name: /weapons/i });
    // jsdom doesn't implement document navigation; cancel the anchor's
    // default action so it doesn't print "Not implemented: navigation to
    // another Document". React's onClick={close} still runs.
    weaponsLink.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(weaponsLink);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when the close button is pressed", () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: /close menu/i }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("exposes the open drawer as a modal dialog", () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const dialog = screen.getByRole("dialog", { name: /site menu/i });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("contains forward keyboard focus within the open drawer", () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const close = screen.getByRole("button", { name: /close menu/i });
    const links = screen.getAllByRole("link");
    const lastLink = links[links.length - 1];
    lastLink.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(close);
  });

  it("contains reverse keyboard focus within the open drawer", () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const close = screen.getByRole("button", { name: /close menu/i });
    const links = screen.getAllByRole("link");
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(links[links.length - 1]);
  });
});
