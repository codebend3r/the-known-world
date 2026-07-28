import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  isViewMode,
} from "@/components/ViewToggle";

const TWO_OPTIONS = [
  { value: "grid" as const, label: "Grid view", icon: <GridIcon /> },
  { value: "list" as const, label: "List view", icon: <ListIcon /> },
];

describe("ViewToggle (polymorphic)", () => {
  it('marks the selected option with aria-pressed="true"', () => {
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={() => {}} />,
    );
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /list view/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("calls onChange when an unselected option is clicked", () => {
    const onChange = jest.fn();
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("does not call onChange when the selected option is clicked", () => {
    const onChange = jest.fn();
    render(
      <ViewToggle options={TWO_OPTIONS} value="list" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes a labelled group using the default ariaLabel", () => {
    render(
      <ViewToggle options={TWO_OPTIONS} value="grid" onChange={() => {}} />,
    );
    expect(screen.getByRole("group", { name: /^view$/i })).toBeDefined();
  });

  it("uses a custom ariaLabel when provided", () => {
    render(
      <ViewToggle
        options={TWO_OPTIONS}
        value="grid"
        onChange={() => {}}
        ariaLabel="Family tree view"
      />,
    );
    expect(
      screen.getByRole("group", { name: /family tree view/i }),
    ).toBeDefined();
  });

  it("renders a third option (smoke test for the generic)", () => {
    const THREE = [
      { value: "a" as const, label: "Option A", icon: <span>A</span> },
      { value: "b" as const, label: "Option B", icon: <span>B</span> },
      { value: "c" as const, label: "Option C", icon: <span>C</span> },
    ];
    const onChange = jest.fn();
    render(<ViewToggle options={THREE} value="b" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /option c/i }));
    expect(onChange).toHaveBeenCalledWith("c");
  });
});

describe("isViewMode", () => {
  it("accepts the two known view modes", () => {
    expect(isViewMode("grid")).toBe(true);
    expect(isViewMode("list")).toBe(true);
  });

  it("rejects any other value, including null and non-strings", () => {
    expect(isViewMode("gallery")).toBe(false);
    expect(isViewMode("")).toBe(false);
    expect(isViewMode(null)).toBe(false);
    expect(isViewMode(undefined)).toBe(false);
    expect(isViewMode(1)).toBe(false);
  });
});
