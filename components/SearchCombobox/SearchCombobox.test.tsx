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
import type { ComboboxItem } from "@/components/SearchCombobox";

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

const { SearchCombobox } = await import("@/components/SearchCombobox");

const items: ComboboxItem[] = [
  { slug: "stark", name: "Stark", detail: "The North", aliases: [] },
  { slug: "meadows", name: "Meadows", detail: "The Reach", aliases: [] },
  {
    slug: "mallister",
    name: "Mallister",
    detail: "The Riverlands",
    aliases: [],
  },
];

function renderCombobox(props: Partial<{ items: ComboboxItem[] }> = {}) {
  return render(
    <SearchCombobox
      items={props.items ?? items}
      basePath="/houses"
      placeholder="Search houses…"
      ariaLabel="Search houses"
    />,
  );
}

beforeEach(() => {
  push.mockClear();
});

describe("SearchCombobox", () => {
  it("shows matching suggestions as the user types", () => {
    renderCombobox();
    const input = screen.getByRole("combobox", { name: "Search houses" });
    fireEvent.change(input, { target: { value: "mea" } });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain("Meadows");
  });

  it("renders the detail datum beside the name", () => {
    renderCombobox();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "mea" },
    });
    expect(screen.getByText("(The Reach)")).not.toBeNull();
  });

  it("omits the detail datum when there is none", () => {
    renderCombobox({
      items: [{ slug: "hollow", name: "Hollow", detail: null, aliases: [] }],
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hol" },
    });
    expect(screen.getAllByRole("option")[0]?.textContent).toBe("Hollow");
  });

  it("navigates to the top match on Enter, under the given base path", () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "meadows" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/houses/meadows/");
  });

  it("navigates to the arrow-selected match on Enter", () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    // Both "Meadows" and "Mallister" match on the "ma"/"me" prefix tier only
    // for their own initials, so query the shared substring "a" instead.
    fireEvent.change(input, { target: { value: "ma" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.change(input, { target: { value: "s" } });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/houses/meadows/");
  });

  it("wraps the active option backwards on ArrowUp", () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "s" } });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const options = screen.getAllByRole("option");
    expect(options[options.length - 1]?.getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("navigates on option click", () => {
    renderCombobox();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "stark" },
    });
    fireEvent.click(screen.getByText("Stark"));
    expect(push).toHaveBeenCalledWith("/houses/stark/");
  });

  it("closes the listbox on Escape", () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "mea" } });
    expect(screen.queryByRole("listbox")).not.toBeNull();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows no listbox for an empty query", () => {
    renderCombobox();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("matches on aliases when the query is absent from the name", () => {
    renderCombobox({
      items: [
        {
          slug: "jon-snow",
          name: "Jon Snow",
          detail: "The White Wolf",
          aliases: ["Lord Snow", "The White Wolf"],
        },
      ],
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "white wolf" },
    });
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("clears the query after navigating", () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "stark" } });
    fireEvent.keyDown(input, { key: "Enter" });
    if (!(input instanceof HTMLInputElement)) throw new Error("expected input");
    expect(input.value).toBe("");
  });
});
