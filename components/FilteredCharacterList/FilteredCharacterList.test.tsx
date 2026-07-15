import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import {
  FilteredCharacterList,
  type CharacterItem,
} from "@/components/FilteredCharacterList";
import {
  renderWithNuqs,
  flushNuqs,
  lastQueryString,
  lastSearchParams,
} from "@/lib/testNuqs";

const items: CharacterItem[] = [
  {
    slug: "arya-stark",
    name: "Arya Stark",
    alias: null,
    aliases: [],
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/arya-stark.png",
  },
  {
    slug: "eddard-stark",
    name: "Eddard Stark",
    alias: null,
    aliases: [],
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/eddard-stark.png",
  },
  {
    slug: "tywin-lannister",
    name: "Tywin Lannister",
    alias: null,
    aliases: [],
    primaryHouseSlug: "lannister",
    region: "westerlands",
    portrait: "/characters/tywin-lannister.png",
  },
];

function manyItems(n: number): CharacterItem[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `c-${String(i).padStart(3, "0")}`,
    name: `Char ${String(i).padStart(3, "0")}`,
    alias: null,
    aliases: [],
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/unknown-male.png",
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

describe("FilteredCharacterList", () => {
  it("renders every character by default", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(3);
  });

  it("renders each card as a link to /characters/[slug]/", () => {
    renderWithNuqs(<FilteredCharacterList items={items} />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/characters/arya-stark/");
    expect(hrefs).toContain("/characters/eddard-stark/");
    expect(hrefs).toContain("/characters/tywin-lannister/");
  });

  it("exposes a labelled search input", () => {
    renderWithNuqs(<FilteredCharacterList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search characters/i }),
    ).toBeDefined();
  });

  it("applies a region-tinted modifier class per card", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    expect(container.querySelector(".cardNorth")).not.toBeNull();
    expect(container.querySelector(".cardWesterlands")).not.toBeNull();
  });

  it("falls back to the base card class when no region is known", () => {
    const noRegion: CharacterItem[] = [
      {
        slug: "x",
        name: "X",
        alias: null,
        aliases: [],
        primaryHouseSlug: "unknown",
        region: null,
        portrait: "/characters/unknown-male.png",
      },
    ];
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={noRegion} />,
    );
    expect(container.querySelector(".card")).not.toBeNull();
    expect(container.querySelector("[data-region]")).toBeNull();
  });

  it("renders the alias in brackets when present", () => {
    const aliased: CharacterItem[] = [
      {
        slug: "aegon-i",
        name: "Aegon I Targaryen",
        alias: "The Conqueror",
        aliases: [],
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-i-targaryen.png",
      },
      {
        slug: "aegon-iv",
        name: "Aegon IV Targaryen",
        alias: "The Unworthy",
        aliases: [],
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-iv-targaryen.png",
      },
    ];
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={aliased} />,
    );
    const aliases = Array.from(container.querySelectorAll(".alias")).map(
      (el) => el.textContent,
    );
    expect(aliases).toEqual(["(The Conqueror)", "(The Unworthy)"]);
  });

  it("renders an empty alias span when no alias is set", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    const aliases = Array.from(container.querySelectorAll(".alias")).map(
      (el) => el.textContent,
    );
    expect(aliases.length).toBeGreaterThan(0);
    expect(aliases.every((text) => text === "")).toBe(true);
  });

  it("renders portrait, sigil, name, then alias in that order inside each card", () => {
    const aliased: CharacterItem[] = [
      {
        slug: "aegon-i",
        name: "Aegon I Targaryen",
        alias: "The Conqueror",
        aliases: [],
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-i-targaryen.png",
      },
    ];
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={aliased} />,
    );
    const card = container.querySelector(".card");
    const childClasses = Array.from(card?.children ?? []).map(
      (el) => el.className,
    );
    expect(childClasses).toEqual(["portrait", "sigil", "name", "alias"]);
    const img = card?.querySelector(".portrait img") as HTMLImageElement | null;
    expect(img?.getAttribute("src") ?? "").toContain("aegon-i-targaryen.png");
  });

  it("does not filter until the 300ms debounce elapses", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "arya" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.querySelectorAll(".item").length).toBe(3);
  });

  it("filters the list once the debounce elapses", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "stark" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const cards = container.querySelectorAll(".item");
    expect(cards.length).toBe(2);
    const names = Array.from(cards).map((el) => el.textContent ?? "");
    expect(names.some((n) => n.includes("Arya Stark"))).toBe(true);
    expect(names.some((n) => n.includes("Eddard Stark"))).toBe(true);
  });

  it("renders the empty state when nothing matches", () => {
    renderWithNuqs(<FilteredCharacterList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no characters match/i)).toBeDefined();
  });

  it("hides pagination when the filtered list is at or below the smallest page size", () => {
    renderWithNuqs(<FilteredCharacterList items={items} pageSize={24} />);
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });

  it("keeps the pagination nav visible above the smallest page size even when one page suffices", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(25)} pageSize={48} />,
    );
    const navs = screen.getAllByRole("navigation", { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 1/);
    const prevButtons = screen.getAllByRole("button", {
      name: /previous page/i,
    }) as HTMLButtonElement[];
    const nextButtons = screen.getAllByRole("button", {
      name: /next page/i,
    }) as HTMLButtonElement[];
    expect(prevButtons.every((b) => b.disabled)).toBe(true);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(
      screen.getAllByRole("combobox", { name: /characters per page/i }).length,
    ).toBe(2);
  });

  it("shows the first page of items and a pagination nav when there is overflow", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(24);
    const navs = screen.getAllByRole("navigation", { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 3/);
    const prevButtons = screen.getAllByRole("button", {
      name: /previous page/i,
    }) as HTMLButtonElement[];
    expect(prevButtons.every((b) => b.disabled)).toBe(true);
  });

  it("renders a pagination nav above and below the list", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const children = Array.from(container.children);
    const list = children.find((el) => el.classList.contains("list"));
    const navs = children.filter((el) => el.classList.contains("pagination"));
    expect(navs.length).toBe(2);
    expect(children.indexOf(navs[0])).toBeLessThan(
      children.indexOf(list as Element),
    );
    expect(children.indexOf(navs[1])).toBeGreaterThan(
      children.indexOf(list as Element),
    );
    expect(navs[0].classList.contains("paginationTop")).toBe(true);
    expect(navs[1].classList.contains("paginationBottom")).toBe(true);
  });

  it("advances to the next page when Next is clicked from the top nav", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("Char 024");
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
  });

  it("disables Next on the last page", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const nextButtons = screen.getAllByRole("button", {
      name: /next page/i,
    }) as HTMLButtonElement[];
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[0]);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
  });

  it("renders the page-size selector with all four options and 24 selected by default", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    const optionLabels = Array.from(topSelect.options).map(
      (o) => o.textContent,
    );
    expect(optionLabels).toEqual(["24", "48", "72", "120"]);
    expect(topSelect.value).toBe("24");
  });

  it("switches to page size 48 and recomputes the page count", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    expect(container.querySelectorAll(".item").length).toBe(48);
    expect(screen.getAllByText(/Page 1 of 2/).length).toBe(2);
  });

  it("resets to page 1 when the page size changes", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    expect(screen.getAllByText(/Page 1 of 2/).length).toBe(2);
  });

  it("keeps the top and bottom selectors in sync", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const selects = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: "120" } });
    const after = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    expect(after[0].value).toBe("120");
    expect(after[1].value).toBe("120");
  });

  it("hydrates the search input from the ?search= query param on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
      { searchParams: "?search=arya" },
    );
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("arya");
    const cards = container.querySelectorAll(".item");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Arya Stark");
  });

  it("writes the debounced search to the ?search= query param", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
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
      <FilteredCharacterList items={items} />,
      { searchParams: "?search=arya" },
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
      <FilteredCharacterList items={items} />,
      { searchParams: "?sort=name" },
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "arya" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("sort")).toBe("name");
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("arya");
  });

  it("renders the search input, sort toggle, and view toggle inside the same row", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
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

  it("resets to page 1 when the search filter changes", () => {
    const lots: CharacterItem[] = [
      ...manyItems(60),
      {
        slug: "arya-stark",
        name: "Arya Stark",
        alias: null,
        aliases: [],
        primaryHouseSlug: "stark",
        region: "north",
        portrait: "/characters/arya-stark.png",
      },
    ];
    renderWithNuqs(<FilteredCharacterList items={lots} pageSize={24} />);
    const [nextBtn] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/Page 2/).length).toBe(2);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "arya" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Search shrinks results to 1, so pagination disappears entirely.
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });
});

describe("FilteredCharacterList sort direction", () => {
  it("renders the sort toggle pressed to ascending by default", () => {
    renderWithNuqs(<FilteredCharacterList items={items} />);
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

  it("orders items A→Z when direction is ascending", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Arya Stark", "Eddard Stark", "Tywin Lannister"]);
  });

  it("hydrates sort direction from ?dir=desc on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
      { searchParams: "?dir=desc" },
    );
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Tywin Lannister", "Eddard Stark", "Arya Stark"]);
    expect(
      screen
        .getByRole("button", { name: /sort z to a/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("writes ?dir=desc when the descending toggle is clicked", async () => {
    const { container, onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?dir=desc");
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Tywin Lannister", "Eddard Stark", "Arya Stark"]);
  });

  it("removes ?dir= when the direction is toggled back to ascending", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
      { searchParams: "?dir=desc" },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort a to z/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("preserves other query params when syncing direction", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
      { searchParams: "?search=stark" },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("stark");
    expect(lastSearchParams(onUrlUpdate).get("dir")).toBe("desc");
  });

  it("ignores an unknown ?dir= value and falls back to ascending", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
      { searchParams: "?dir=sideways" },
    );
    const names = Array.from(container.querySelectorAll(".name")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Arya Stark", "Eddard Stark", "Tywin Lannister"]);
  });
});

describe("FilteredCharacterList page size persistence", () => {
  it("hydrates the page size from ?size=48 on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?size=48" },
    );
    expect(container.querySelectorAll(".item").length).toBe(48);
    const selects = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    expect(selects[0].value).toBe("48");
  });

  it("writes ?size= when the page size selector changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?size=48");
  });

  it("removes ?size= when the page size returns to the default", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?size=48" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "24" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("ignores an unknown ?size= value and falls back to the default", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?size=99" },
    );
    expect(container.querySelectorAll(".item").length).toBe(24);
  });

  it("preserves other query params when syncing size", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?search=char" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("search")).toBe("char");
    expect(lastSearchParams(onUrlUpdate).get("size")).toBe("48");
  });

  it("resets to page 1 when the sort direction changes", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });
});

describe("FilteredCharacterList page persistence", () => {
  it("hydrates the current page from ?page=3 on mount", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=3" },
    );
    expect(container.querySelectorAll(".item").length).toBe(22);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("Char 048");
  });

  it("writes ?page=2 when Next is clicked from page 1", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?page=2");
  });

  it("removes ?page= when Prev returns to page 1", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    const [topPrev] = screen.getAllByRole("button", { name: /previous page/i });
    fireEvent.click(topPrev);
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  it("resets ?page= when the search filter changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "char" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=char");
  });

  it("resets ?page= when the sort direction changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    fireEvent.click(screen.getByRole("button", { name: /sort z to a/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?dir=desc");
  });

  it("resets ?page= when the page size changes", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?page=2" },
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "48" } });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?size=48");
  });

  it("ignores an invalid ?page= value and falls back to page 1", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      {
        searchParams: "?page=abc",
      },
    );
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });

  it("ignores a ?page= value below 1 and falls back to page 1", () => {
    renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      {
        searchParams: "?page=0",
      },
    );
    expect(screen.getAllByText(/Page 1 of 3/).length).toBe(2);
  });

  it("preserves other query params when paginating", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredCharacterList items={manyItems(70)} pageSize={24} />,
      { searchParams: "?dir=desc" },
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    await flushNuqs();
    expect(lastSearchParams(onUrlUpdate).get("dir")).toBe("desc");
    expect(lastSearchParams(onUrlUpdate).get("page")).toBe("2");
  });
});

describe("FilteredCharacterList view toggle", () => {
  it("starts in grid view by default", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    expect(container.querySelector("ul.list")).not.toBeNull();
    expect(container.querySelector("ul.listView")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("switches to list view when the list button is clicked", () => {
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
    expect(window.localStorage.getItem("gota:characters-view")).toBe("list");
  });

  it("hydrates the stored choice from localStorage after mount", () => {
    window.localStorage.setItem("gota:characters-view", "list");
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
  });

  it("ignores invalid stored values and stays in grid view", () => {
    window.localStorage.setItem("gota:characters-view", "kanban");
    const { container } = renderWithNuqs(
      <FilteredCharacterList items={items} />,
    );
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).toBeNull();
  });
});
