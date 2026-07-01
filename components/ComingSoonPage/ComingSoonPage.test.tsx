import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

describe("ComingSoonPage", () => {
  it("renders the given title as h1", () => {
    render(<ComingSoonPage title="Map" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Map");
  });

  it('renders a breadcrumb link to / labelled "Atlas of the Known World"', () => {
    render(<ComingSoonPage title="Map" />);
    const breadcrumb = screen.getByRole("link", {
      name: /atlas of the known world/i,
    });
    expect(breadcrumb.getAttribute("href")).toBe("/");
  });

  it('renders a "Return to the menu" link pointing at /', () => {
    render(<ComingSoonPage title="Map" />);
    const back = screen.getByRole("link", { name: /return to the menu/i });
    expect(back.getAttribute("href")).toBe("/");
  });

  it('renders the "coming soon" placeholder sentence', () => {
    render(<ComingSoonPage title="Map" />);
    expect(screen.getByText(/coming soon/i)).toBeDefined();
  });
});
