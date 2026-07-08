import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import {
  FilteredHouseList,
  type HouseItem,
} from "@/components/FilteredHouseList";
import {
  renderWithNuqs,
  flushNuqs,
  lastQueryString,
  lastSearchParams,
} from "@/lib/testNuqs";

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
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("FilteredHouseList", () => {
  it("renders every house card by default", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    const cards = screen.getAllByRole("link");
    expect(cards.length).toBe(3);
  });

  it("exposes a labelled search input", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search houses/i }),
    ).toBeDefined();
  });

  it("does not filter until the 300ms debounce elapses", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "stark" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.getAllByRole("link").length).toBe(3);
  });

  it("filters the list once the debounce elapses", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
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
    renderWithNuqs(<FilteredHouseList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link").length).toBe(0);
    expect(screen.getByText(/no houses match/i)).toBeDefined();
  });

  it("applies the region-tinted class to each card", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    expect(container.querySelector(".cardNorth")).not.toBeNull();
    expect(container.querySelector(".cardWesterlands")).not.toBeNull();
  });

  it("shows the total house count across all pages", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />);
    expect(screen.getByText("70 houses")).toBeDefined();
  });

  it("uses the singular noun for a single house", () => {
    renderWithNuqs(<FilteredHouseList items={items.slice(0, 1)} />);
    expect(screen.getByText("1 house")).toBeDefined();
  });

  it("updates the count to matching-of-total when a search filters the list", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("1 of 3 houses")).toBeDefined();
  });

  it("reflects a zero count when nothing matches the search", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("0 of 3 houses")).toBeDefined();
  });

  it("renders the search input, sort toggle, and view toggle inside the same row", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    const row = container.querySelector(".controls");
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

describe("FilteredHouseList region grouping", () => {
  const northAndVale: HouseItem[] = [
    { slug: "stark", name: "Stark", region: "north", regionLabel: "The North" },
    {
      slug: "bolton",
      name: "Bolton",
      region: "north",
      regionLabel: "The North",
    },
    { slug: "arryn", name: "Arryn", region: "vale", regionLabel: "The Vale" },
  ];

  it("exposes a grouping toggle", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    expect(screen.getByRole("group", { name: /grouping/i })).toBeDefined();
  });

  it("replaces the flat list with a collapsed accordion per region", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    // The global search input is gone; accordions supply their own.
    expect(screen.queryByRole("searchbox")).toBeNull();
    const north = screen.getByRole("button", { name: /the north/i });
    expect(north.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.getByRole("button", { name: /the westerlands/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /the riverlands/i }),
    ).toBeDefined();
    // Collapsed accordions render no house cards.
    expect(screen.queryAllByRole("link").length).toBe(0);
  });

  it("only lists regions that have houses", () => {
    renderWithNuqs(<FilteredHouseList items={northAndVale} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    expect(screen.getByRole("button", { name: /the north/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /the vale/i })).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /the riverlands/i }),
    ).toBeNull();
  });

  it("shows the house count in each region header", () => {
    renderWithNuqs(<FilteredHouseList items={northAndVale} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    expect(
      screen.getByRole("button", { name: /the north/i }).textContent,
    ).toContain("2");
  });

  it("expands a region to reveal its houses", () => {
    renderWithNuqs(<FilteredHouseList items={northAndVale} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    fireEvent.click(screen.getByRole("button", { name: /the north/i }));
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Stark")]),
    );
    expect(links.length).toBe(2);
  });

  it("scopes each region's search input to that region's houses", () => {
    renderWithNuqs(<FilteredHouseList items={northAndVale} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    fireEvent.click(screen.getByRole("button", { name: /the north/i }));
    const search = screen.getByRole("searchbox", { name: /search the north/i });
    fireEvent.change(search, { target: { value: "bolton" } });
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain("Bolton");
  });

  it("keeps the grouping choice in localStorage", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    expect(window.localStorage.getItem("gota:houses-grouping")).toBe("region");
  });
});

describe("FilteredHouseList search persistence", () => {
  it("hydrates the search input from the ?search= query param on mount", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />, {
      searchParams: "?search=stark",
    });
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("stark");
    const cards = container.querySelectorAll(".item");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Stark");
  });

  it("writes the debounced search to the ?search= query param", async () => {
    const { onUrlUpdate } = renderWithNuqs(<FilteredHouseList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=stark");
  });

  it("removes the ?search= query param when the search is cleared", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={items} />,
      {
        searchParams: "?search=stark",
      },
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("preserves other query params when syncing search", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={items} />,
      {
        searchParams: "?dir=desc",
      },
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("dir")).toBe("desc");
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("stark");
  });
});

describe("FilteredHouseList sort direction", () => {
  it("renders the sort toggle pressed to ascending by default", () => {
    renderWithNuqs(<FilteredHouseList items={items} />);
    expect(
      screen
        .getByRole("button", { name: /sort a to z/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("orders items A→Z when direction is ascending", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Lannister", "Stark", "Tully"]);
  });

  it("hydrates sort direction from ?dir=desc on mount", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />, {
      searchParams: "?dir=desc",
    });
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

  it("writes ?dir=desc when the descending toggle is clicked", async () => {
    const { container, onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={items} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?dir=desc");
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Tully", "Stark", "Lannister"]);
  });

  it("removes ?dir= when the direction is toggled back to ascending", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={items} />,
      {
        searchParams: "?dir=desc",
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort a to z/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("preserves other query params when syncing direction", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={items} />,
      {
        searchParams: "?search=stark",
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("stark");
    expect(lastSearchParams(onUrlUpdate).get("dir")).toBe("desc");
  });

  it("ignores an unknown ?dir= value and falls back to ascending", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />, {
      searchParams: "?dir=sideways",
    });
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Lannister", "Stark", "Tully"]);
  });
});

describe("FilteredHouseList pagination", () => {
  it("hides pagination when the filtered list is at or below the smallest page size", () => {
    renderWithNuqs(<FilteredHouseList items={items} pageSize={24} />);
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });

  it("renders a pagination nav above and below the list when there is overflow", () => {
    const { container } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(24);
    const navs = screen.getAllByRole("navigation", { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 3/);
  });

  it("advances to the next page when Next is clicked from the top nav", () => {
    const { container } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("House 024");
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
  });

  it("disables Next on the last page", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />);
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
    renderWithNuqs(<FilteredHouseList items={lots} pageSize={24} />);
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
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />);
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });
});

describe("FilteredHouseList page size persistence", () => {
  it("renders the page-size selector with all four options and 24 selected by default", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    const optionLabels = Array.from(topSelect.options).map(
      (o) => o.textContent,
    );
    expect(optionLabels).toEqual(["24", "48", "72", "120"]);
    expect(topSelect.value).toBe("24");
  });

  it("hydrates the page size from ?size=48 on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?size=48" },
    );
    expect(container.querySelectorAll(".item").length).toBe(48);
    const selects = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    expect(selects[0].value).toBe("48");
  });

  it("writes ?size= when the page size selector changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?size=48");
  });

  it("removes ?size= when the page size returns to the default", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?size=48" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "24" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("keeps the top and bottom selectors in sync", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />);
    const selects = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: "120" } });
    const after = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    expect(after[0].value).toBe("120");
    expect(after[1].value).toBe("120");
  });

  it("preserves other query params when syncing size", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?search=house" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("house");
    expect(lastSearchParams(onUrlUpdate).get("size")).toBe("48");
  });
});

describe("FilteredHouseList page persistence", () => {
  it("hydrates the current page from ?page=3 on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=3" },
    );
    expect(container.querySelectorAll(".item").length).toBe(22);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("House 048");
  });

  it("writes ?page=2 when Next is clicked from page 1", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?page=2");
  });

  it("removes ?page= when Prev returns to page 1", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    const [topPrev] = screen.getAllByRole("button", { name: /previous page/i });
    fireEvent.click(topPrev);
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("resets ?page= when the search filter changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "house" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=house");
  });

  it("resets ?page= when the sort direction changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?dir=desc");
  });

  it("resets ?page= when the page size changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /houses per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?size=48");
  });

  it("ignores an invalid ?page= value and falls back to page 1", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />, {
      searchParams: "?page=abc",
    });
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });

  it("ignores a ?page= value below 1 and falls back to page 1", () => {
    renderWithNuqs(<FilteredHouseList items={manyItems(70)} pageSize={24} />, {
      searchParams: "?page=0",
    });
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });

  it("preserves other query params when paginating", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?dir=desc" },
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("dir")).toBe("desc");
    expect(lastSearchParams(onUrlUpdate).get("page")).toBe("2");
  });
});

describe("FilteredHouseList status filter", () => {
  const mixed: HouseItem[] = [
    { slug: "stark", name: "Stark", region: "north", regionLabel: "The North" },
    {
      slug: "reyne",
      name: "Reyne",
      region: "westerlands",
      regionLabel: "The Westerlands",
      extinct: true,
    },
    {
      slug: "gardener",
      name: "Gardener",
      region: "reach",
      regionLabel: "The Reach",
      extinct: true,
    },
  ];

  it("exposes a house-status filter group", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    expect(screen.getByRole("group", { name: /house status/i })).toBeDefined();
  });

  it("shows every house regardless of status by default", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    expect(screen.getAllByRole("link").length).toBe(3);
  });

  it("shows only extinct houses when Extinct is selected", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    fireEvent.click(screen.getByRole("button", { name: /extinct houses/i }));
    const cards = screen.getAllByRole("link");
    expect(cards.map((c) => c.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Reyne"),
        expect.stringContaining("Gardener"),
      ]),
    );
    expect(cards.length).toBe(2);
  });

  it("shows only standing houses when Standing is selected", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    fireEvent.click(screen.getByRole("button", { name: /standing houses/i }));
    const cards = screen.getAllByRole("link");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Stark");
  });

  it("reflects the status filter in the total count", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    expect(screen.getByText("3 houses")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /extinct houses/i }));
    expect(screen.getByText("2 houses")).toBeDefined();
  });

  it("hydrates the filter from ?status=extinct on mount", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />, {
      searchParams: "?status=extinct",
    });
    expect(screen.getAllByRole("link").length).toBe(2);
    expect(
      screen
        .getByRole("button", { name: /extinct houses/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("writes ?status=extinct when Extinct is selected", async () => {
    const { onUrlUpdate } = renderWithNuqs(<FilteredHouseList items={mixed} />);
    fireEvent.click(screen.getByRole("button", { name: /extinct houses/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?status=extinct");
  });

  it("removes ?status= when the filter returns to Any status", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={mixed} />,
      {
        searchParams: "?status=extinct",
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /any status/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("resets ?page= when the status filter changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredHouseList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    fireEvent.click(screen.getByRole("button", { name: /standing houses/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?status=standing");
  });

  it("applies the status filter inside region grouping", () => {
    renderWithNuqs(<FilteredHouseList items={mixed} />);
    fireEvent.click(screen.getByRole("button", { name: /group by region/i }));
    fireEvent.click(screen.getByRole("button", { name: /extinct houses/i }));
    expect(
      screen.getByRole("button", { name: /the westerlands/i }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /the reach/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /the north/i })).toBeNull();
  });
});

describe("FilteredHouseList view toggle", () => {
  it("starts in grid view by default", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    expect(container.querySelector("ul.list")).not.toBeNull();
    expect(container.querySelector("ul.listView")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("switches to list view when the list button is clicked", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
    expect(window.localStorage.getItem("gota:houses-view")).toBe("list");
  });

  it("hydrates the stored choice from localStorage after mount", () => {
    window.localStorage.setItem("gota:houses-view", "list");
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
  });

  it("ignores invalid stored values and stays in grid view", () => {
    window.localStorage.setItem("gota:houses-view", "kanban");
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).toBeNull();
  });

  it("shows the region label on each list row", () => {
    const { container } = renderWithNuqs(<FilteredHouseList items={items} />);
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
