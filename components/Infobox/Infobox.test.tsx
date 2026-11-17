import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import {
  CharacterInfoRow,
  InfoEntry,
  InfoField,
  InfoRow,
} from "@/components/Infobox";
import type { Character, HouseInfoEntry } from "@/lib/schemas";
import { expectElement } from "@/test/dom";

const ned: HouseInfoEntry = { slug: "eddard-stark", name: "Eddard Stark" };
const benjen: HouseInfoEntry = { slug: "benjen-stark", name: "Benjen Stark" };
const unnamed: HouseInfoEntry = { name: "The Ned's steward" };

function renderEntry({
  entry,
  extra = {},
}: {
  entry: HouseInfoEntry;
  extra?: Record<string, unknown>;
}) {
  return render(
    <ul>
      <InfoEntry entry={entry} {...extra} />
    </ul>,
  );
}

describe("InfoEntry", () => {
  it("links an entry that has a slug and a prefix", () => {
    renderEntry({ entry: ned, extra: { hrefPrefix: "/characters" } });
    const link = screen.getByRole("link", { name: "Eddard Stark" });
    expect(link.getAttribute("href")).toBe("/characters/eddard-stark/");
  });

  it("renders plain text when no prefix is supplied", () => {
    renderEntry({ entry: ned });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Eddard Stark")).toBeDefined();
  });

  it("renders plain text when the slug has no entry of its own", () => {
    renderEntry({
      entry: ned,
      extra: { hrefPrefix: "/characters", exists: () => false },
    });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Eddard Stark")).toBeDefined();
  });

  it("renders plain text for a slugless entry", () => {
    renderEntry({ entry: unnamed, extra: { hrefPrefix: "/characters" } });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("The Ned's steward")).toBeDefined();
  });

  it("hangs a parenthesised note beside the name", () => {
    renderEntry({
      entry: { ...ned, note: "beheaded" },
      extra: { hrefPrefix: "/characters" },
    });
    const note = screen.getByText("(beheaded)");
    expect(note.className).toBe("note");
  });

  it("passes the entry slug to the existence probe", () => {
    const asked: string[] = [];
    renderEntry({
      entry: ned,
      extra: {
        hrefPrefix: "/characters",
        exists: (slug: string) => {
          asked.push(slug);
          return true;
        },
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
    expect(
      expectElement({ element: container.firstElementChild, type: HTMLElement })
        .className,
    ).toBe("row");
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

describe("InfoField", () => {
  it("renders a label and its value as one row", () => {
    const { container } = render(
      <dl>
        <InfoField label="Color">Black and red</InfoField>
      </dl>,
    );
    expect(container.querySelector(".row dt")?.textContent ?? "").toBe("Color");
    expect(container.querySelector(".row dd")?.textContent ?? "").toBe(
      "Black and red",
    );
  });

  it("renders nothing when the value is empty", () => {
    const { container } = render(
      <dl>
        <InfoField label="A">{null}</InfoField>
        <InfoField label="B">{undefined}</InfoField>
        <InfoField label="C">{""}</InfoField>
        <InfoField label="D">{false}</InfoField>
      </dl>,
    );
    expect(container.querySelector(".row")).toBeNull();
  });
});

describe("CharacterInfoRow", () => {
  const base: Character = {
    slug: "robb-stark",
    name: "Robb Stark",
    sex: "m",
    born: { year: 283, era: "AC", precision: "year" },
    died: { year: 299, era: "AC", precision: "year" },
    "primary-house": "stark",
    "also-of-houses": [],
    parents: [],
    spouses: [],
    children: [],
    titles: [],
    aliases: [],
    mentions: [],
    placeholder: false,
    "placeholder-reason": null,
    "exclude-from-tree": false,
    sources: [],
    draft: false,
  };
  const unwritten: Character = {
    ...base,
    slug: "torrhen-karstark",
    name: "Torrhen Karstark",
    placeholder: true,
    "placeholder-reason": "unwritten",
  };
  const charactersBySlug = new Map<string, Character>([
    [base.slug, base],
    [unwritten.slug, unwritten],
  ]);

  it("names characters from the map and links only written ones", () => {
    render(
      <dl>
        <CharacterInfoRow
          label="Riders"
          slugs={["robb-stark", "torrhen-karstark", "walder-frey"]}
          charactersBySlug={charactersBySlug}
        />
      </dl>,
    );
    expect(
      screen.getByRole("link", { name: "Robb Stark" }).getAttribute("href"),
    ).toBe("/characters/robb-stark/");
    expect(screen.queryByRole("link", { name: "Torrhen Karstark" })).toBeNull();
    expect(screen.getByText("Walder Frey")).toBeDefined();
  });

  it("keeps the given names when passed entries", () => {
    render(
      <dl>
        <CharacterInfoRow
          label="Heads"
          entries={[{ slug: "robb-stark", name: "The Young Wolf" }]}
          charactersBySlug={charactersBySlug}
        />
      </dl>,
    );
    expect(
      screen.getByRole("link", { name: "The Young Wolf" }).getAttribute("href"),
    ).toBe("/characters/robb-stark/");
  });
});
