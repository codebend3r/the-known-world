import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FamilyTree } from "@/components/FamilyTree";
import type { TreeNode, TreeSpouse } from "@/lib/family-tree";

function spouse(overrides: Partial<TreeSpouse> = {}): TreeSpouse {
  return {
    slug: null,
    name: "Spouse",
    alias: null,
    sex: null,
    placeholder: false,
    inHouse: false,
    titles: [],
    ...overrides,
  };
}

function node(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    slug: "person",
    name: "Person",
    alias: null,
    sex: null,
    placeholder: false,
    external: false,
    born: null,
    died: null,
    titles: [],
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe("FamilyTree", () => {
  it("renders the empty-state message when there are no roots", () => {
    render(<FamilyTree roots={[]} />);
    expect(
      screen.getByText(/no members of this house have yet been recorded/i),
    ).toBeDefined();
  });

  it("renders a single root with name and lifespan", () => {
    render(
      <FamilyTree
        roots={[node({ slug: "eddard", name: "Eddard", born: 263, died: 299 })]}
      />,
    );
    expect(screen.getByText("Eddard")).toBeDefined();
    expect(screen.getByText("263–299")).toBeDefined();
  });

  it("formats an open-ended lifespan when death is unknown", () => {
    render(
      <FamilyTree
        roots={[node({ slug: "sansa", name: "Sansa", born: 286, died: null })]}
      />,
    );
    expect(screen.getByText("286–")).toBeDefined();
  });

  it("uses `?` when birth year is unknown but death is known", () => {
    render(
      <FamilyTree
        roots={[node({ slug: "x", name: "X", born: null, died: 100 })]}
      />,
    );
    expect(screen.getByText("?–100")).toBeDefined();
  });

  it("omits the lifespan element when both years are null", () => {
    const { container } = render(
      <FamilyTree roots={[node({ slug: "x", name: "X" })]} />,
    );
    expect(container.querySelector(".lifespan")).toBeNull();
  });

  it("links names with a slug, but renders unlinked spans for placeholders", () => {
    render(
      <FamilyTree
        roots={[
          node({ slug: "real", name: "Real" }),
          node({ slug: "ghost", name: "Ghost", placeholder: true }),
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /real/i }).getAttribute("href"),
    ).toBe("/characters/real/");
    expect(screen.queryByRole("link", { name: /ghost/i })).toBeNull();
    expect(screen.getByText("Ghost")).toBeDefined();
  });

  it("renders gender glyphs with accessible labels", () => {
    render(
      <FamilyTree
        roots={[
          node({ slug: "m1", name: "M1", sex: "m" }),
          node({ slug: "f1", name: "F1", sex: "f" }),
          node({ slug: "u1", name: "U1", sex: null }),
        ]}
      />,
    );
    expect(screen.getByLabelText("male").textContent).toBe("♂");
    expect(screen.getByLabelText("female").textContent).toBe("♀");
    expect(screen.queryAllByLabelText(/^(male|female)$/)).toHaveLength(2);
  });

  it("renders a crown for titles beginning with `King`", () => {
    render(
      <FamilyTree
        roots={[
          node({
            slug: "robert",
            name: "Robert",
            titles: ["King of the Andals"],
          }),
        ]}
      />,
    );
    expect(screen.getByLabelText("king").textContent).toBe("♛");
  });

  it("does not render a crown when no title begins with `King`", () => {
    render(
      <FamilyTree
        roots={[node({ slug: "x", name: "X", titles: ["Lord of Winterfell"] })]}
      />,
    );
    expect(screen.queryByLabelText("king")).toBeNull();
  });

  it("renders spouses with the marriage cross glyph", () => {
    render(
      <FamilyTree
        roots={[
          node({
            slug: "eddard",
            name: "Eddard",
            spouses: [spouse({ slug: "catelyn", name: "Catelyn" })],
          }),
        ]}
      />,
    );
    expect(screen.getByText("Catelyn")).toBeDefined();
    expect(screen.getByText("⚭")).toBeDefined();
  });

  it("renders an alias in parens after the name", () => {
    render(
      <FamilyTree
        roots={[node({ slug: "ned", name: "Eddard", alias: "Ned" })]}
      />,
    );
    expect(screen.getByText(/\(Ned\)/)).toBeDefined();
  });

  it("recursively renders nested children in a `<ul>`", () => {
    const { container } = render(
      <FamilyTree
        roots={[
          node({
            slug: "eddard",
            name: "Eddard",
            children: [
              node({
                slug: "robb",
                name: "Robb",
                children: [node({ slug: "ricklet", name: "Ricklet" })],
              }),
              node({ slug: "sansa", name: "Sansa" }),
            ],
          }),
        ]}
      />,
    );
    const top = container.querySelector("ul.tree") as HTMLElement;
    expect(top).not.toBeNull();
    expect(within(top).getByText("Eddard")).toBeDefined();
    expect(within(top).getByText("Robb")).toBeDefined();
    expect(within(top).getByText("Sansa")).toBeDefined();
    expect(within(top).getByText("Ricklet")).toBeDefined();
    expect(top.querySelectorAll("ul.children")).toHaveLength(2);
  });
});
