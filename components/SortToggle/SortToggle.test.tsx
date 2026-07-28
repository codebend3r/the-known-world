import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { SortToggle } from "@/components/SortToggle";

describe("SortToggle", () => {
  it('marks the selected direction with aria-pressed="true"', () => {
    render(<SortToggle value="asc" onChange={() => {}} />);
    expect(
      screen
        .getByRole("button", { name: /sort a to z/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /sort z to a/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("calls onChange when the unselected direction is clicked", () => {
    const onChange = jest.fn();
    render(<SortToggle value="asc" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(onChange).toHaveBeenCalledWith("desc");
  });

  it("does not call onChange when the selected direction is clicked", () => {
    const onChange = jest.fn();
    render(<SortToggle value="desc" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes a labelled group", () => {
    render(<SortToggle value="asc" onChange={() => {}} />);
    expect(
      screen.getByRole("group", { name: /sort direction/i }),
    ).toBeDefined();
  });
});
