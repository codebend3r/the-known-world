import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  FilteredCharacterList,
  type CharacterItem,
} from "@/components/FilteredCharacterList";

const items: CharacterItem[] = [
  {
    slug: "arya-stark",
    name: "Arya Stark",
    alias: null,
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/arya-stark.png",
  },
  {
    slug: "eddard-stark",
    name: "Eddard Stark",
    alias: null,
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/eddard-stark.png",
  },
  {
    slug: "tywin-lannister",
    name: "Tywin Lannister",
    alias: null,
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
    primaryHouseSlug: "stark",
    region: "north",
    portrait: "/characters/unknown-male.png",
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/characters/");
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/characters/");
});

describe("FilteredCharacterList", () => {
  it("renders every character by default", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelectorAll(".item").length).toBe(3);
  });

  it("renders each card as a link to /characters/[slug]/", () => {
    render(<FilteredCharacterList items={items} />);
    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/characters/arya-stark/");
    expect(hrefs).toContain("/characters/eddard-stark/");
    expect(hrefs).toContain("/characters/tywin-lannister/");
  });

  it("exposes a labelled search input", () => {
    render(<FilteredCharacterList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search characters/i }),
    ).toBeDefined();
  });

  it("applies a region-tinted modifier class per card", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelector(".cardNorth")).not.toBeNull();
    expect(container.querySelector(".cardWesterlands")).not.toBeNull();
  });

  it("falls back to the base card class when no region is known", () => {
    const noRegion: CharacterItem[] = [
      {
        slug: "x",
        name: "X",
        alias: null,
        primaryHouseSlug: "unknown",
        region: null,
        portrait: "/characters/unknown-male.png",
      },
    ];
    const { container } = render(<FilteredCharacterList items={noRegion} />);
    expect(container.querySelector(".card")).not.toBeNull();
    expect(container.querySelector("[data-region]")).toBeNull();
  });

  it("renders the alias in brackets when present", () => {
    const aliased: CharacterItem[] = [
      {
        slug: "aegon-i",
        name: "Aegon I Targaryen",
        alias: "The Conqueror",
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-i-targaryen.png",
      },
      {
        slug: "aegon-iv",
        name: "Aegon IV Targaryen",
        alias: "The Unworthy",
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-iv-targaryen.png",
      },
    ];
    const { container } = render(<FilteredCharacterList items={aliased} />);
    const aliases = Array.from(container.querySelectorAll(".alias")).map(
      (el) => el.textContent,
    );
    expect(aliases).toEqual(["(The Conqueror)", "(The Unworthy)"]);
  });

  it("omits the alias span when no alias is set", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelector(".alias")).toBeNull();
  });

  it("renders portrait, sigil, name, then alias in that order inside each card", () => {
    const aliased: CharacterItem[] = [
      {
        slug: "aegon-i",
        name: "Aegon I Targaryen",
        alias: "The Conqueror",
        primaryHouseSlug: "targaryen",
        region: "crownlands",
        portrait: "/characters/aegon-i-targaryen.png",
      },
    ];
    const { container } = render(<FilteredCharacterList items={aliased} />);
    const card = container.querySelector(".card");
    const childClasses = Array.from(card?.children ?? []).map(
      (el) => el.className,
    );
    expect(childClasses).toEqual(["portrait", "sigil", "name", "alias"]);
    const img = card?.querySelector(".portrait img") as HTMLImageElement | null;
    expect(img?.getAttribute("src") ?? "").toContain("aegon-i-targaryen.png");
  });

  it("does not filter until the 300ms debounce elapses", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "arya" } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.querySelectorAll(".item").length).toBe(3);
  });

  it("filters the list once the debounce elapses", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
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
    render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no characters match/i)).toBeDefined();
  });

  it("hides pagination when the filtered list is at or below the smallest page size", () => {
    render(<FilteredCharacterList items={items} pageSize={30} />);
    expect(
      screen.queryByRole("navigation", { name: /pagination/i }),
    ).toBeNull();
  });

  it("keeps the pagination nav visible above 10 items even when one page suffices", () => {
    render(<FilteredCharacterList items={manyItems(25)} pageSize={30} />);
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
    const { container } = render(
      <FilteredCharacterList items={manyItems(75)} pageSize={30} />,
    );
    expect(container.querySelectorAll(".item").length).toBe(30);
    const navs = screen.getAllByRole("navigation", { name: /pagination/i });
    expect(navs.length).toBe(2);
    expect(navs[0].textContent).toMatch(/Page 1 of 3/);
    const prevButtons = screen.getAllByRole("button", {
      name: /previous page/i,
    }) as HTMLButtonElement[];
    expect(prevButtons.every((b) => b.disabled)).toBe(true);
  });

  it("renders a pagination nav above and below the list", () => {
    const { container } = render(
      <FilteredCharacterList items={manyItems(75)} pageSize={30} />,
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
    const { container } = render(
      <FilteredCharacterList items={manyItems(75)} pageSize={30} />,
    );
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    const firstCardName = container.querySelector(".name")?.textContent;
    expect(firstCardName).toBe("Char 030");
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
  });

  it("disables Next on the last page", () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const nextButtons = screen.getAllByRole("button", {
      name: /next page/i,
    }) as HTMLButtonElement[];
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[0]);
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
    expect(screen.getAllByText(/Page 3 of 3/).length).toBe(2);
  });

  it("renders the page-size selector with all five options and 30 selected by default", () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    const optionLabels = Array.from(topSelect.options).map(
      (o) => o.textContent,
    );
    expect(optionLabels).toEqual(["10", "30", "60", "100", "All"]);
    expect(topSelect.value).toBe("30");
  });

  it("switches to page size 10 and recomputes the page count", () => {
    const { container } = render(
      <FilteredCharacterList items={manyItems(75)} pageSize={30} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "10" } });
    expect(container.querySelectorAll(".item").length).toBe(10);
    expect(screen.getAllByText(/Page 1 of 8/).length).toBe(2);
  });

  it('switches to "All" and renders every item on one page', () => {
    const { container } = render(
      <FilteredCharacterList items={manyItems(75)} pageSize={30} />,
    );
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "Infinity" } });
    expect(container.querySelectorAll(".item").length).toBe(75);
    expect(screen.getAllByText(/Page 1 of 1/).length).toBe(2);
    const nextButtons = screen.getAllByRole("button", {
      name: /next page/i,
    }) as HTMLButtonElement[];
    expect(nextButtons.every((b) => b.disabled)).toBe(true);
  });

  it("resets to page 1 when the page size changes", () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const [topNext] = screen.getAllByRole("button", { name: /next page/i });
    fireEvent.click(topNext);
    expect(screen.getAllByText(/Page 2 of 3/).length).toBe(2);
    const [topSelect] = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(topSelect, { target: { value: "60" } });
    expect(screen.getAllByText(/Page 1 of 2/).length).toBe(2);
  });

  it("keeps the top and bottom selectors in sync", () => {
    render(<FilteredCharacterList items={manyItems(75)} pageSize={30} />);
    const selects = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: "100" } });
    const after = screen.getAllByRole("combobox", {
      name: /characters per page/i,
    }) as HTMLSelectElement[];
    expect(after[0].value).toBe("100");
    expect(after[1].value).toBe("100");
  });

  it("hydrates the search input from the ?search= query param on mount", () => {
    window.history.replaceState(null, "", "/characters/?search=arya");
    const { container } = render(<FilteredCharacterList items={items} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("arya");
    const cards = container.querySelectorAll(".item");
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain("Arya Stark");
  });

  it("writes the debounced search to the ?search= query param", () => {
    render(<FilteredCharacterList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "stark" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("?search=stark");
  });

  it("removes the ?search= query param when the search is cleared", () => {
    window.history.replaceState(null, "", "/characters/?search=arya");
    render(<FilteredCharacterList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("");
  });

  it("preserves other query params and the hash when syncing search", () => {
    window.history.replaceState(null, "", "/characters/?sort=name#top");
    render(<FilteredCharacterList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "arya" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.location.search).toBe("?sort=name&search=arya");
    expect(window.location.hash).toBe("#top");
  });

  it("renders the search input and view toggle inside the same row", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    const row = container.querySelector(".row");
    expect(row).not.toBeNull();
    expect(row?.querySelector("input")).not.toBeNull();
    expect(row?.querySelector('[role="group"]')).not.toBeNull();
  });

  it("resets to page 1 when the search filter changes", () => {
    const lots: CharacterItem[] = [
      ...manyItems(60),
      {
        slug: "arya-stark",
        name: "Arya Stark",
        alias: null,
        primaryHouseSlug: "stark",
        region: "north",
        portrait: "/characters/arya-stark.png",
      },
    ];
    render(<FilteredCharacterList items={lots} pageSize={30} />);
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

describe("FilteredCharacterList view toggle", () => {
  it("starts in grid view by default", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    expect(container.querySelector("ul.list")).not.toBeNull();
    expect(container.querySelector("ul.listView")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /grid view/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("switches to list view when the list button is clicked", () => {
    const { container } = render(<FilteredCharacterList items={items} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
    expect(window.localStorage.getItem("gota:characters-view")).toBe("list");
  });

  it("hydrates the stored choice from localStorage after mount", () => {
    window.localStorage.setItem("gota:characters-view", "list");
    const { container } = render(<FilteredCharacterList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).not.toBeNull();
  });

  it("ignores invalid stored values and stays in grid view", () => {
    window.localStorage.setItem("gota:characters-view", "kanban");
    const { container } = render(<FilteredCharacterList items={items} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(container.querySelector("ul.listView")).toBeNull();
  });
});
