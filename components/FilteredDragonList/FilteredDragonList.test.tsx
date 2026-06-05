import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  FilteredDragonList,
  type DragonItem,
} from "@/components/FilteredDragonList";

const items: DragonItem[] = [
  {
    slug: "balerion",
    name: "Balerion",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
  },
  {
    slug: "vhagar",
    name: "Vhagar",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
  },
  {
    slug: "cannibal",
    name: "The Cannibal",
    houseSlug: null,
    region: null,
    regionLabel: null,
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("FilteredDragonList", () => {
  it("renders every dragon by default", () => {
    render(<FilteredDragonList items={items} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("exposes a labelled search input", () => {
    render(<FilteredDragonList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search dragons/i }),
    ).toBeDefined();
  });

  it("filters after the 300ms debounce", () => {
    render(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cannibal" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Cannibal");
  });

  it("applies the wild card class to dragons with no house", () => {
    const { container } = render(<FilteredDragonList items={items} />);
    expect(container.querySelector(".cardWild")).not.toBeNull();
  });

  it("renders the empty state when nothing matches", () => {
    render(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no dragons match/i)).toBeDefined();
  });
});
