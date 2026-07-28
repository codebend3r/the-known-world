import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ListSearchSkeleton } from "@/components/ListSearchSkeleton";

describe("ListSearchSkeleton", () => {
  it("renders a disabled search input with the given placeholder", () => {
    render(<ListSearchSkeleton placeholder="Search dragons…" />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe("Search dragons…");
  });

  it("labels the input from the placeholder without the ellipsis", () => {
    render(<ListSearchSkeleton placeholder="Search houses…" />);
    expect(
      screen.getByRole("searchbox", { name: "Search houses" }),
    ).toBeDefined();
  });

  it("uses the plain row by default and the sort row when withControls", () => {
    const { container, rerender } = render(
      <ListSearchSkeleton placeholder="Search dragons…" />,
    );
    expect(container.querySelector(".row")).not.toBeNull();
    expect(container.querySelector(".rowWithSort")).toBeNull();

    rerender(<ListSearchSkeleton placeholder="Search houses…" withControls />);
    expect(container.querySelector(".rowWithSort")).not.toBeNull();
  });
});
