import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { InfoEntry, InfoRow } from "@/components/Infobox";
import type { HouseInfoEntry } from "@/lib/schemas";

const ned: HouseInfoEntry = { slug: "eddard-stark", name: "Eddard Stark" };
const benjen: HouseInfoEntry = { slug: "benjen-stark", name: "Benjen Stark" };
const unnamed: HouseInfoEntry = { name: "The Ned's steward" };

function renderEntry(
  entry: HouseInfoEntry,
  extra: Record<string, unknown> = {},
) {
  return render(
    <ul>
      <InfoEntry entry={entry} {...extra} />
    </ul>,
  );
}

describe("InfoEntry", () => {
  it("links an entry that has a slug and a prefix", () => {
    renderEntry(ned, { hrefPrefix: "/characters" });
    const link = screen.getByRole("link", { name: "Eddard Stark" });
    expect(link.getAttribute("href")).toBe("/characters/eddard-stark/");
  });

  it("renders plain text when no prefix is supplied", () => {
    renderEntry(ned);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Eddard Stark")).toBeDefined();
  });

  it("renders plain text when the slug has no entry of its own", () => {
    renderEntry(ned, { hrefPrefix: "/characters", exists: () => false });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Eddard Stark")).toBeDefined();
  });

  it("renders plain text for a slugless entry", () => {
    renderEntry(unnamed, { hrefPrefix: "/characters" });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("The Ned's steward")).toBeDefined();
  });

  it("hangs a parenthesised note beside the name", () => {
    renderEntry({ ...ned, note: "beheaded" }, { hrefPrefix: "/characters" });
    const note = screen.getByText("(beheaded)");
    expect(note.className).toBe("note");
  });

  it("passes the entry slug to the existence probe", () => {
    const asked: string[] = [];
    renderEntry(ned, {
      hrefPrefix: "/characters",
      exists: (slug: string) => {
        asked.push(slug);
        return true;
      },
    });
    expect(asked).toEqual(["eddard-stark"]);
  });
});

describe("InfoRow", () => {
  it("renders nothing at all when the row is empty", () => {
    const { container } = render(<InfoRow label="Heads" entries={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("pairs the label with one list item per entry, in order", () => {
    const { container } = render(
      <InfoRow
        label="Heads"
        entries={[ned, benjen]}
        hrefPrefix="/characters"
      />,
    );
    expect(screen.getByText("Heads").tagName).toBe("DT");
    const items = [...container.querySelectorAll("li")];
    expect(items.map((item) => item.textContent)).toEqual([
      "Eddard Stark",
      "Benjen Stark",
    ]);
  });

  it("wraps the pair in a row so the dl grid can place it", () => {
    const { container } = render(<InfoRow label="Heads" entries={[ned]} />);
    expect(container.firstElementChild?.className).toBe("row");
  });

  it("applies the existence probe per entry", () => {
    render(
      <InfoRow
        label="Heads"
        entries={[ned, benjen]}
        hrefPrefix="/characters"
        exists={(slug) => slug === "eddard-stark"}
      />,
    );
    expect(screen.getByRole("link", { name: "Eddard Stark" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Benjen Stark" })).toBeNull();
  });
});
