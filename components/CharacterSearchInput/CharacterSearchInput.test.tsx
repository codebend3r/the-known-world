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
import { fireEvent, render, screen } from "@testing-library/react";
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

const { CharacterSearchInput } =
  await import("@/components/CharacterSearchInput");

function asInput(el: HTMLElement): HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) throw new Error("expected an input");
  return el;
}

const items: SearchIndexItem[] = [
  {
    slug: "naerys-targaryen",
    name: "Naerys Targaryen",
    detail: null,
    aliases: [],
  },
  {
    slug: "aemon-targaryen",
    name: "Aemon Targaryen",
    detail: "The Dragonknight",
    aliases: ["The Dragonknight"],
  },
  {
    slug: "aegon-iv-targaryen",
    name: "Aegon IV Targaryen",
    detail: "The Unworthy",
    aliases: ["The Unworthy"],
  },
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

describe("CharacterSearchInput — filter mode", () => {
  it("renders a controlled field and reports changes", () => {
    const onChange = jest.fn();
    render(<CharacterSearchInput value="ed" onChange={onChange} />);
    const input = asInput(
      screen.getByRole("searchbox", { name: "Search characters" }),
    );
    expect(input.value).toBe("ed");
    fireEvent.change(input, { target: { value: "edd" } });
    expect(onChange).toHaveBeenCalledWith("edd");
  });

  it("shows no suggestion listbox in filter mode", () => {
    render(<CharacterSearchInput value="aem" onChange={jest.fn()} />);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("CharacterSearchInput — autocomplete mode", () => {
  it("fetches the character roll on first focus, not on render", async () => {
    render(<CharacterSearchInput autocomplete />);
    expect(fetchIndex).not.toHaveBeenCalled();
    await typeQuery("aem");
    expect(fetchIndex).toHaveBeenCalledWith("/search-index/characters.json");
  });

  it("shows matching suggestions as the user types", async () => {
    render(<CharacterSearchInput autocomplete />);
    await typeQuery("aem");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain("Aemon Targaryen");
  });

  it("navigates to the top match on Enter", async () => {
    render(<CharacterSearchInput autocomplete />);
    const input = await typeQuery("aegon");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/characters/aegon-iv-targaryen/");
  });

  it("navigates to the arrow-selected match on Enter", async () => {
    render(<CharacterSearchInput autocomplete />);
    const input = await typeQuery("targaryen");
    // Matches rank equally on " targaryen", so they keep source order:
    // Naerys, Aemon, Aegon. Two ArrowDowns lands on the second, Aemon.
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/characters/aemon-targaryen/");
  });

  it("navigates on option click", async () => {
    render(<CharacterSearchInput autocomplete />);
    await typeQuery("naerys");
    fireEvent.click(screen.getByText("Naerys Targaryen"));
    expect(push).toHaveBeenCalledWith("/characters/naerys-targaryen/");
  });

  it("closes the listbox on Escape", async () => {
    render(<CharacterSearchInput autocomplete />);
    const input = await typeQuery("aem");
    expect(screen.queryByRole("listbox")).not.toBeNull();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows no listbox for an empty query", () => {
    render(<CharacterSearchInput autocomplete />);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("matches on alias when the query doesn't appear in the name", async () => {
    render(<CharacterSearchInput autocomplete />);
    await typeQuery("dragonknight");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain("Aemon Targaryen");
  });
});
