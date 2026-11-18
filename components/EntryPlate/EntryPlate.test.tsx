import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { EntryBackLink, EntryPlate } from "@/components/EntryPlate";

const BACK = { href: "/battles/", label: "All Battles" };

describe("EntryPlate", () => {
  it("renders the title, subtitle, body, and back link inside the plate", () => {
    render(
      <EntryPlate
        layout="narrow"
        title="The Red Wedding"
        subtitle="Massacre · 299 AC"
        html="<p>The Freys struck.</p>"
        back={BACK}
        sources={[]}
      />,
    );
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "The Red Wedding",
    );
    expect(screen.getByText("Massacre · 299 AC").className).toBe("subtitle");
    expect(screen.getByText("The Freys struck.").closest("article")).not.toBe(
      null,
    );
    expect(
      screen.getByRole("link", { name: "← All Battles" }).getAttribute("href"),
    ).toBe("/battles/");
  });

  it("keeps an empty subtitle but omits an undefined one", () => {
    const { container, rerender } = render(
      <EntryPlate
        layout="narrow"
        title="A"
        subtitle=""
        html=""
        back={BACK}
        sources={[]}
      />,
    );
    expect(container.querySelector(".subtitle")).not.toBe(null);
    rerender(
      <EntryPlate layout="narrow" title="A" html="" back={BACK} sources={[]} />,
    );
    expect(container.querySelector(".subtitle")).toBe(null);
  });

  it("omits the article when the body is blank", () => {
    const { container } = render(
      <EntryPlate layout="narrow" title="A" html="" back={BACK} sources={[]} />,
    );
    expect(container.querySelector("article")).toBe(null);
  });

  it("renders the infobox slot before the main column", () => {
    const { container } = render(
      <EntryPlate
        layout="sidebar"
        title="A"
        html=""
        back={BACK}
        sources={[]}
        infobox={({ className }) => (
          <aside className={className} data-testid="infobox" />
        )}
      >
        <figure data-testid="figure" />
      </EntryPlate>,
    );
    const infobox = screen.getByTestId("infobox");
    expect(infobox.className).not.toBe("");
    expect(
      infobox.nextElementSibling?.contains(screen.getByTestId("figure")) ??
        false,
    ).toBe(true);
    expect(container.querySelectorAll("aside").length).toBe(1);
  });

  it("renders the banner slot between the heading and the infobox", () => {
    render(
      <EntryPlate
        layout="banner"
        title="A"
        html=""
        back={BACK}
        sources={[]}
        banner={({ className }) => (
          <figure className={className} data-testid="banner" />
        )}
        infobox={({ className }) => (
          <aside className={className} data-testid="infobox" />
        )}
      />,
    );
    const banner = screen.getByTestId("banner");
    expect(banner.previousElementSibling?.tagName ?? "").toBe("HGROUP");
    expect(banner.nextElementSibling).toBe(screen.getByTestId("infobox"));
  });
});

describe("EntryBackLink", () => {
  it("renders an arrowed link back to the index", () => {
    render(<EntryBackLink href="/houses/" label="All Houses" />);
    const link = screen.getByRole("link", { name: "← All Houses" });
    expect(link.getAttribute("href")).toBe("/houses/");
    expect(link.parentElement?.tagName ?? "").toBe("P");
  });
});
