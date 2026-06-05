import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it('renders the wordmark "The Known World" linking to /', () => {
    render(<SiteHeader />);
    const home = screen.getByRole("link", { name: /the known world/i });
    expect(home.getAttribute("href")).toBe("/");
  });
});
