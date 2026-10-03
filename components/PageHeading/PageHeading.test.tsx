import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { PageHeading } from "@/components/PageHeading";

describe("PageHeading", () => {
  it("renders the title as an h1", () => {
    render(<PageHeading title="Houses" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Houses" }),
    ).toBeDefined();
  });

  it("renders the ornamental filigree rule under the title", () => {
    const { container } = render(<PageHeading title="Houses" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the subtitle when provided", () => {
    render(<PageHeading title="Houses" subtitle="The rolls of the realm." />);
    expect(screen.getByText("The rolls of the realm.")).toBeDefined();
  });

  it("omits the subtitle when not provided", () => {
    const { container } = render(<PageHeading title="Characters" />);
    expect(container.querySelector(".subtitle")).toBeNull();
  });

  it("draws the rule in the section's filigree variant", () => {
    const { container } = render(<PageHeading title="Maps" filigree="scale" />);
    expect(container.querySelector("hgroup > span")?.className).toContain(
      "scale",
    );
  });
});
