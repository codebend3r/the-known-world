import {
  describe,
  it,
  expect,
  jest,
  mock,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SearchIndexItem } from "@/lib/search-index";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";

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

const items: SearchIndexItem[] = [
  { slug: "meadows", name: "Meadows", detail: "The Reach", aliases: [] },
  {
    slug: "mallister",
    name: "Mallister",
    detail: "The Riverlands",
    aliases: [],
  },
  { slug: "manwoody", name: "Manwoody", detail: null, aliases: [] },
];

const fetchIndex = jest.fn(async () => Response.json(items));

beforeEach(() => {
  push.mockClear();
  fetchIndex.mockClear();
  stubGlobal({ name: "fetch", value: fetchIndex });
});

afterEach(() => {
  unstubAllGlobals();
});

// The roll arrives on first focus, so the field is focused and then given
// time for that fetch to land before the query is typed.
async function typeQuery(value: string): Promise<HTMLElement> {
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  await screen.findAllByRole("option");
  return input;
}

describe("HouseSearchInput", () => {
  it("labels the field for houses by default", () => {
    render(<HouseSearchInput />);
    const input = screen.getByRole("combobox", { name: "Search houses" });
    expect(input.getAttribute("placeholder")).toBe("Search houses…");
  });

  it("fetches the house roll on first hover, not on render", async () => {
    render(<HouseSearchInput />);
    expect(fetchIndex).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByRole("combobox"));
    await waitFor(() =>
      expect(fetchIndex).toHaveBeenCalledWith("/search-index/houses.json"),
    );
  });

  it("suggests matching houses with their region", async () => {
    render(<HouseSearchInput />);
    await typeQuery("mall");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent ?? null).toBe("Mallister(The Riverlands)");
  });

  it("omits the region when a house has none", async () => {
    render(<HouseSearchInput />);
    await typeQuery("manwoody");
    expect(screen.getAllByRole("option")[0]?.textContent ?? null).toBe(
      "Manwoody",
    );
  });

  it("navigates to the chosen house page", async () => {
    render(<HouseSearchInput />);
    const input = await typeQuery("meadows");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/houses/meadows/");
  });

  it("accepts an overridden placeholder and label", () => {
    render(
      <HouseSearchInput
        placeholder="Jump to a house…"
        ariaLabel="Jump to a house"
      />,
    );
    const input = screen.getByRole("combobox", { name: "Jump to a house" });
    expect(input.getAttribute("placeholder")).toBe("Jump to a house…");
  });
});
