import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListSearchInput } from "@/components/ListSearchInput";

describe("ListSearchInput", () => {
  it("is a labelled searchbox showing the current value", () => {
    render(
      <ListSearchInput
        value="stark"
        onChange={() => {}}
        placeholder="Search houses…"
        ariaLabel="Search houses"
      />,
    );
    const input = screen.getByRole("searchbox", { name: "Search houses" });
    expect(input.getAttribute("value")).toBe("stark");
    expect(input.getAttribute("placeholder")).toBe("Search houses…");
  });

  it("reports the raw typed value, not the event", () => {
    const onChange = jest.fn();
    render(
      <ListSearchInput
        value=""
        onChange={onChange}
        placeholder="p"
        ariaLabel="Search"
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "tully" },
    });
    expect(onChange).toHaveBeenCalledWith("tully");
  });

  it("keeps autocomplete and spellcheck off so the field stays a filter", () => {
    render(
      <ListSearchInput
        value=""
        onChange={() => {}}
        placeholder="p"
        ariaLabel="Search"
      />,
    );
    const input = screen.getByRole("searchbox");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });
});
