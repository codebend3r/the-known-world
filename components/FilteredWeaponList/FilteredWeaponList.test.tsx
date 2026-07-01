import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import {
  FilteredWeaponList,
  type WeaponItem,
} from "@/components/FilteredWeaponList";
import { renderWithNuqs, flushNuqs, lastQueryString } from "@/lib/testNuqs";

const items: WeaponItem[] = [
  {
    slug: "blackfyre",
    name: "Blackfyre",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
    hasImage: true,
  },
  {
    slug: "heartsbane",
    name: "Heartsbane",
    houseSlug: "tarly",
    region: "reach",
    regionLabel: "The Reach",
    hasImage: false,
  },
  {
    slug: "ice",
    name: "Ice",
    houseSlug: "stark",
    region: "north",
    regionLabel: "The North",
    hasImage: false,
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FilteredWeaponList", () => {
  it("renders every weapon by default", () => {
    renderWithNuqs(<FilteredWeaponList items={items} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });

  it("exposes a labelled search input", () => {
    renderWithNuqs(<FilteredWeaponList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search weapons/i }),
    ).toBeDefined();
  });

  it("filters after the 300ms debounce", () => {
    renderWithNuqs(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ice" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Ice");
  });

  it("renders the empty state when nothing matches", () => {
    renderWithNuqs(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no weapons match/i)).toBeDefined();
  });

  it("renders a house sigil on each weapon that belongs to a house", () => {
    const { container } = renderWithNuqs(<FilteredWeaponList items={items} />);
    const sigils = container.querySelectorAll(".sigil img");
    expect(sigils).toHaveLength(3);
  });

  it("omits the sigil for a weapon with no house", () => {
    const houseless: WeaponItem = {
      slug: "dawn",
      name: "Dawn",
      houseSlug: null,
      region: null,
      regionLabel: null,
      hasImage: false,
    };
    const { container } = renderWithNuqs(
      <FilteredWeaponList items={[houseless]} />,
    );
    expect(container.querySelector(".sigil")).toBeNull();
  });

  it("marks only the weapons that have an image with the indicator", () => {
    const { container } = renderWithNuqs(<FilteredWeaponList items={items} />);
    expect(container.querySelectorAll(".indicator")).toHaveLength(1);
  });

  it("hydrates the search input and filter from the ?search= query param", () => {
    renderWithNuqs(<FilteredWeaponList items={items} />, {
      searchParams: "?search=ice",
    });
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("ice");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Ice");
  });

  it("writes the debounced search to the ?search= query param", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredWeaponList items={items} />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ice" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=ice");
  });

  it("removes the ?search= query param when the search is cleared", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredWeaponList items={items} />,
      { searchParams: "?search=ice" },
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });
});
