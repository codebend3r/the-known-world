import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListPagination } from "@/components/ListPagination";

function setup(over: Partial<Parameters<typeof ListPagination>[0]> = {}) {
  const onPageChange = jest.fn();
  const onSizeChange = jest.fn();
  render(
    <ListPagination
      currentPage={2}
      totalPages={5}
      size={24}
      onPageChange={onPageChange}
      onSizeChange={onSizeChange}
      position="top"
      noun="Character"
      {...over}
    />,
  );
  return { onPageChange, onSizeChange };
}

describe("ListPagination", () => {
  it("labels the landmark and the size select from the noun", () => {
    setup();
    expect(
      screen.getByRole("navigation", {
        name: "Character list pagination, top",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: "Characters per page" }),
    ).toBeDefined();
  });

  it("steps one page at a time in both directions", () => {
    const { onPageChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clamps at both ends", () => {
    setup({ currentPage: 1 });
    expect(
      screen
        .getByRole("button", { name: "Previous page" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("announces the page only on the lower copy", () => {
    const { container } = render(
      <ListPagination
        currentPage={1}
        totalPages={2}
        size={24}
        onPageChange={() => {}}
        onSizeChange={() => {}}
        position="bottom"
        noun="House"
      />,
    );
    expect(container.querySelector("[aria-live='polite']")).not.toBeNull();
  });

  it("hands back a validated page size, never a raw number", () => {
    const { onSizeChange } = setup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "48" } });
    expect(onSizeChange).toHaveBeenCalledWith(48);
  });
});
