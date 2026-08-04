import {
  describe,
  it,
  expect,
  jest,
  mock,
  beforeEach,
  afterAll,
} from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { HouseSuggestion } from "@/components/HouseSearchInput";

const push = jest.fn();

// `mock.module` is not hoisted, so the component has to be imported after the
// mock is installed. Restoring afterwards keeps `next/navigation` mocked for
// this file only, even if the suite is ever run without `--isolate`.
mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterAll(() => {
  mock.restore();
});

const { HouseSearchInput } = await import("@/components/HouseSearchInput");

const items: HouseSuggestion[] = [
  { slug: "meadows", name: "Meadows", region: "The Reach" },
  { slug: "mallister", name: "Mallister", region: "The Riverlands" },
  { slug: "manwoody", name: "Manwoody", region: null },
];

beforeEach(() => {
  push.mockClear();
});

describe("HouseSearchInput", () => {
  it("labels the field for houses by default", () => {
    render(<HouseSearchInput items={items} />);
    const input = screen.getByRole("combobox", { name: "Search houses" });
    expect(input.getAttribute("placeholder")).toBe("Search houses…");
  });

  it("suggests matching houses with their region", () => {
    render(<HouseSearchInput items={items} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "mall" },
    });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toBe("Mallister(The Riverlands)");
  });

  it("omits the region when a house has none", () => {
    render(<HouseSearchInput items={items} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "manwoody" },
    });
    expect(screen.getAllByRole("option")[0]?.textContent).toBe("Manwoody");
  });

  it("navigates to the chosen house page", () => {
    render(<HouseSearchInput items={items} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "meadows" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/houses/meadows/");
  });

  it("accepts an overridden placeholder and label", () => {
    render(
      <HouseSearchInput
        items={items}
        placeholder="Jump to a house…"
        ariaLabel="Jump to a house"
      />,
    );
    const input = screen.getByRole("combobox", { name: "Jump to a house" });
    expect(input.getAttribute("placeholder")).toBe("Jump to a house…");
  });
});
