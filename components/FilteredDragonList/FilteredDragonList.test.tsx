import { describe, it, expect } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import {
  FilteredDragonList,
  type DragonItem,
} from "@/components/FilteredDragonList";
import {
  advanceTime,
  renderWithNuqs,
  flushNuqs,
  lastQueryString,
} from "@/lib/testNuqs";

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

describe("FilteredDragonList", () => {
  it("renders every dragon by default", () => {
    renderWithNuqs(<FilteredDragonList items={items} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("exposes a labelled search input", () => {
    renderWithNuqs(<FilteredDragonList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search dragons/i }),
    ).toBeDefined();
  });

  it("filters after the 300ms debounce", async () => {
    renderWithNuqs(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cannibal" },
    });
    await advanceTime({ ms: 400 });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Cannibal");
  });

  it("applies the wild card class to dragons with no house", () => {
    const { container } = renderWithNuqs(<FilteredDragonList items={items} />);
    expect(container.querySelector(".cardWild")).not.toBeNull();
  });

  it("renders the empty state when nothing matches", async () => {
    renderWithNuqs(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    await advanceTime({ ms: 400 });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no dragons match/i)).toBeDefined();
  });

  it("hydrates the search input and filter from the ?search= query param", () => {
    renderWithNuqs(<FilteredDragonList items={items} />, {
      searchParams: "?search=cannibal",
    });
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("cannibal");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Cannibal");
  });

  it("writes the debounced search to the ?search= query param", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredDragonList items={items} />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "vhagar" },
    });
    await advanceTime({ ms: 400 });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=vhagar");
  });

  it("removes the ?search= query param when the search is cleared", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredDragonList items={items} />,
      { searchParams: "?search=vhagar" },
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    await advanceTime({ ms: 400 });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });
});
