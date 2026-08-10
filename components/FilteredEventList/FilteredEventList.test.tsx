import { describe, it, expect } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import {
  FilteredEventList,
  type EventItem,
} from "@/components/FilteredEventList";
import {
  advanceTime,
  renderWithNuqs,
  flushNuqs,
  lastQueryString,
} from "@/lib/testNuqs";

const items: EventItem[] = [
  {
    slug: "the-doom-of-valyria",
    name: "The Doom of Valyria",
    typeLabel: "Disaster",
    when: "114 BC*",
    location: "Valyria",
    approximate: true,
  },
  {
    slug: "the-red-wedding",
    name: "The Red Wedding",
    typeLabel: "Wedding",
    when: "299 AC",
    location: "The Twins",
    approximate: false,
  },
  {
    slug: "the-tourney-at-harrenhal",
    name: "The Tourney at Harrenhal",
    typeLabel: "Other",
    when: "281 AC",
    location: null,
    approximate: false,
  },
];

describe("FilteredEventList", () => {
  it("renders every event by default", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("links each event to its detail route", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/events/the-red-wedding/");
  });

  it("exposes a labelled search input", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search events/i }),
    ).toBeDefined();
  });

  it("joins the type and place into one meta line", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    expect(screen.getByText("Wedding · The Twins")).toBeDefined();
  });

  it("omits the separator when an event has no named place", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    expect(screen.getByText("Other")).toBeDefined();
  });

  it("shows the approximate-date legend while an approximate event is listed", () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    expect(screen.getByText(/approximate or legendary date/i)).toBeDefined();
  });

  it("drops the legend once every listed event has an exact date", async () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "red wedding" },
    });
    await advanceTime({ ms: 400 });
    expect(screen.queryByText(/approximate or legendary date/i)).toBeNull();
  });

  it("filters after the 300ms debounce", async () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "doom" },
    });
    await advanceTime({ ms: 400 });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Doom");
  });

  it("renders the empty state when nothing matches", async () => {
    renderWithNuqs(<FilteredEventList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    await advanceTime({ ms: 400 });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no events match/i)).toBeDefined();
  });

  it("hydrates the search input and filter from the ?search= query param", () => {
    renderWithNuqs(<FilteredEventList items={items} />, {
      searchParams: "?search=doom",
    });
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("doom");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Doom");
  });

  it("writes the debounced search to the ?search= query param", async () => {
    const { onUrlUpdate } = renderWithNuqs(<FilteredEventList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "harrenhal" },
    });
    await advanceTime({ ms: 400 });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?search=harrenhal");
  });

  it("removes the ?search= query param when the search is cleared", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FilteredEventList items={items} />,
      { searchParams: "?search=harrenhal" },
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    await advanceTime({ ms: 400 });
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });
});
