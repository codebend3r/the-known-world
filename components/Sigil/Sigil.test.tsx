import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Sigil } from "@/components/Sigil";

describe("Sigil", () => {
  it("renders nothing when the slug is null", () => {
    const { container } = render(<Sigil slug={null} name="Nobody" />);
    expect(container.innerHTML).toBe("");
  });

  it("resolves a registered slug to its own artwork", () => {
    render(<Sigil slug="stark" name="Stark" />);
    const image = screen.getByRole("img", { name: "Sigil of House Stark" });
    expect(image.getAttribute("src")).toBe("/sigils/stark.png");
  });

  it("redirects an aliased slug to the file it shares", () => {
    render(<Sigil slug="durrandon" name="Durrandon" />);
    const image = screen.getByRole("img", { name: "Sigil of House Durrandon" });
    expect(image.getAttribute("src")).toBe("/sigils/baratheon.png");
  });

  it("falls back to the regional sigil for an unregistered slug", () => {
    // `harclay` is deliberately absent from SIGIL_SLUGS; registration, not the
    // filesystem, is what promotes a house past the regional fallback.
    render(<Sigil slug="harclay" name="Harclay" region="north" />);
    const image = screen.getByRole("img", { name: "Sigil of House Harclay" });
    expect(image.getAttribute("src")).toBe("/sigils/the-north.png");
  });

  it("falls back to the unknown sigil with neither a registration nor a region", () => {
    render(<Sigil slug="harclay" name="Harclay" />);
    const image = screen.getByRole("img", { name: "Sigil of House Harclay" });
    expect(image.getAttribute("src")).toBe("/sigils/unknown-westeros.png");
  });

  it("takes the region's heraldic tint as the plate metal", () => {
    const { container } = render(
      <Sigil slug="stark" name="Stark" region="north" />,
    );
    const plate = container.querySelector(".sigil");
    expect(plate?.getAttribute("style")).toContain(
      "--sigil-metal: var(--region-color-north)",
    );
  });

  it("leaves the metal unset for an unknown region so the gold fallback applies", () => {
    const { container } = render(<Sigil slug="stark" name="Stark" />);
    const plate = container.querySelector(".sigil");
    expect(plate?.getAttribute("style") ?? "").not.toContain("--sigil-metal");
  });

  it("passes an explicit size through as the plate size and the image sizes hint", () => {
    const { container } = render(
      <Sigil slug="stark" name="Stark" size="1.5rem" />,
    );
    const plate = container.querySelector(".sigil");
    expect(plate?.getAttribute("style")).toContain("--sigil-size: 1.5rem");
    expect(screen.getByRole("img").getAttribute("sizes")).toBe("1.5rem");
  });

  it("prefers an explicit sizes hint over the size", () => {
    render(<Sigil slug="stark" name="Stark" size="1.5rem" sizes="96px" />);
    expect(screen.getByRole("img").getAttribute("sizes")).toBe("96px");
  });

  it("empties the alt text on a decorative sigil", () => {
    const { container } = render(
      <Sigil slug="stark" name="Stark" decorative />,
    );
    expect(screen.queryByRole("img", { name: /sigil of house/i })).toBeNull();
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("merges a caller class onto the plate", () => {
    const { container } = render(
      <Sigil slug="stark" name="Stark" className="shield" />,
    );
    const plate = container.querySelector(".sigil");
    expect(plate?.className).toBe("sigil shield");
  });
});
