import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  FilteredHouseList,
  type HouseItem,
} from "@/components/FilteredHouseList";

const items: HouseItem[] = [
  { slug: "stark", name: "Stark", region: "north", regionLabel: "The North" },
  {
    slug: "lannister",
    name: "Lannister",
    region: "westerlands",
    regionLabel: "The Westerlands",
  },
  {
    slug: "tully",
    name: "Tully",
    region: "riverlands",
    regionLabel: "The Riverlands",
  },
];

function manyItems(n: number): HouseItem[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `h-${String(i).padStart(3, "0")}`,
    name: `House ${String(i).padStart(3, "0")}`,
    region: "north",
    regionLabel: "The North",
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/houses/");
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/houses/");
});

describe("FilteredHouseList", () => {
  it("renders every house card by default", () => {
    render(<FilteredHouseList items={items} />);
    const cards = screen.getAllByRole("link");
    expect(cards.length).toBe(3);
  });

  it("exposes a labelled search input", () => {
    render(<FilteredHouseList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search houses/i }),
    ).toBeDefined();
  });

  it("does not filter until the 300ms debounce elapses", () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "stark" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.getAllByRole("link").length).toBe(3);
  });

  it("filters the list once the debounce elapses", () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "stark" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const cards = screen.getAllByRole("link");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Stark");
  });

  it("renders the empty state when nothing matches", () => {
    render(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link").length).toBe(0);
    expect(screen.getByText(/no houses match/i)).toBeDefined();
  });

  it("applies the region-tinted class to each card", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    expect(container.querySelector(".cardNorth")).not.toBeNull();
    expect(container.querySelector(".cardWesterlands")).not.toBeNull();
  });

  it("renders the search input, sort toggle, and view toggle inside the same row", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    const row = container.querySelector(".rowWithSort");
    expect(row).not.toBeNull();
    expect(row?.querySelector("input")).not.toBeNull();
    expect(
      row?.querySelector('[role="group"][aria-label="Sort direction"]'),
    ).not.toBeNull();
    expect(
      row?.querySelector('[role="group"][aria-label="View"]'),
    ).not.toBeNull();
  });
});

describe("FilteredHouseList search persistence", () => {
  it("hydrates the search input from the ?search= query param on mount", () => {
    window.history.replaceState(null, "", "/houses/?search=stark");
    const { container } = render(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("stark");
    const cards = container.querySelectorAll(".item");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Stark");
  });

  it("writes the debounced search to the ?search= query param", () => {
    render(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("?search=stark");
  });

  it("removes the ?search= query param when the search is cleared", () => {
    window.history.replaceState(null, "", "/houses/?search=stark");
    render(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("");
  });

  it("preserves other query params and the hash when syncing search", () => {
    window.history.replaceState(null, "", "/houses/?dir=desc#top");
    render(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("?dir=desc&search=stark");
    expect(window.location.hash).toBe("#top");
  });
});

describe("FilteredHouseList sort direction", () => {
  it("renders the sort toggle pressed to ascending by default", () => {
    render(<FilteredHouseList items={items} />);
    expect(
      screen
        .getByRole("button", { name: /sort a to z/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("orders items A→Z when direction is ascending", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Lannister", "Stark", "Tully"]);
  });

  it("hydrates sort direction from ?dir=desc on mount", () => {
    window.history.replaceState(null, "", "/houses/?dir=desc");
    const { container } = render(<FilteredHouseList items={items} />);
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Tully", "Stark", "Lannister"]);
    expect(
      screen
        .getByRole("button", { name: /sort z to a/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("writes ?dir=desc when the descending toggle is clicked", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(window.location.search).toBe("?dir=desc");
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Tully", "Stark", "Lannister"]);
  });

  it("removes ?dir= when the direction is toggled back to ascending", () => {
    window.history.replaceState(null, "", "/houses/?dir=desc");
    render(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /sort a to z/i }));
    expect(window.location.search).toBe("");
  });

  it("preserves other query params and the hash when syncing direction", () => {
    window.history.replaceState(null, "", "/houses/?search=stark#top");
    render(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(window.location.search).toBe("?search=stark&dir=desc");
    expect(window.location.hash).toBe("#top");
  });

  it("ignores an unknown ?dir= value and falls back to ascending", () => {
    window.history.replaceState(null, "", "/houses/?dir=sideways");
    const { container } = render(<FilteredHouseList items={items} />);
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Lannister", "Stark", "Tully"]);
  });
});

describe("FilteredHouseList pagination", () => {
  it("hides pagination when the filtered list is at or below the smallest page size", () => {
    render(<FilteredHouseList items={items} pageSize={32} />);
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });

  it("renders a pagination nav above and below the list when there is overflow", () => {
    const { container } = render(
      <FilteredHouseList items={manyItems(75)} pageSize={32} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(32);
    const navs = screen.getAllByRole("navigation", { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 3/);
  });

  it("advances to the next page when Next is clicked from the top nav", () => {
    const { container } = render(
      <FilteredHouseList items={manyItems(75)} pageSize={32} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("House 032");
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
  });

  it("disables Next on the last page", () => {
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const nextButtons = screen.getAllByRole("button", {
      name: /next page/i,
    }) as HTMLButtonElement[];
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[0]);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
  });

  it("resets to page 1 when the search filter changes", () => {
    const lots: HouseItem[] = [
      ...manyItems(60),
      {
        slug: "stark",
        name: "Stark",
        region: "north",
        regionLabel: "The North",
      },
    ];
    render(<FilteredHouseList items={lots} pageSize={32} />);
    const [nextBtn] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/Page 2/).length).toBe(2);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });

  it("resets to page 1 when the sort direction changes", () => {
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });
});

describe("FilteredHouseList page size persistence", () => {
  it("renders the page-size selector with all four options and 32 selected by default", () => {
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    const optionLabels = Array.from(topSelect.options).map(
      (o) => o.textContent,
    );
    expect(optionLabels).toEqual(["16", "32", "64", "128"]);
    expect(topSelect.value).toBe("32");
  });

  it("hydrates the page size from ?size=64 on mount", () => {
    window.history.replaceState(null, "", "/houses/?size=64");
    const { container } = render(
      <FilteredHouseList items={manyItems(75)} pageSize={32} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(64);
    const selects = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    expect(selects[0].value).toBe("64");
  });

  it("writes ?size= when the page size selector changes", () => {
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "16" } });
    expect(window.location.search).toBe("?size=16");
  });

  it("removes ?size= when the page size returns to the default", () => {
    window.history.replaceState(null, "", "/houses/?size=64");
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "32" } });
    expect(window.location.search).toBe("");
  });

  it("keeps the top and bottom selectors in sync", () => {
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const selects = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: "128" } });
    const after = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    expect(after[0].value).toBe("128");
    expect(after[1].value).toBe("128");
  });

  it("preserves other query params and the hash when syncing size", () => {
    window.history.replaceState(null, "", "/houses/?search=house#top");
    render(<FilteredHouseList items={manyItems(75)} pageSize={32} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "16" } });
    expect(window.location.search).toBe("?search=house&size=16");
    expect(window.location.hash).toBe("#top");
  });
});

describe("FilteredHouseList view toggle", () => {
  it("starts in grid view by default", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    expect(container.querySelector("ul.list")).not.toBeNull();
    expect(container.querySelector("ul.listView")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("switches to list view when the list button is clicked", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
    expect(window.localStorage.getItem("gota:houses-view")).toBe("list");
  });

  it("hydrates the stored choice from localStorage after mount", () => {
    window.localStorage.setItem("gota:houses-view", "list");
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
  });

  it("ignores invalid stored values and stays in grid view", () => {
    window.localStorage.setItem("gota:houses-view", "kanban");
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).toBeNull();
  });

  it("shows the region label on each list row", () => {
    const { container } = render(<FilteredHouseList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    });
    const regions = container.querySelectorAll(".region");
    expect(regions.length).toBe(3);
    expect(Array.from(regions).map((r) => r.textContent)).toEqual(
      expect.arrayContaining([
        "The North",
        "The Westerlands",
        "The Riverlands",
      ]),
    );
  });
});
