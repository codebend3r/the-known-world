import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sources } from "@/components/Sources";
import type { Source } from "@/lib/schemas";

describe("Sources", () => {
  it("returns null when the sources array is empty", () => {
    const { container } = render(<Sources sources={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders an awoiaf source as an external link with the default CC-BY-SA-4.0 license", () => {
    const sources: Source[] = [
      { type: "awoiaf", url: "https://awoiaf.westeros.org/index.php/Stark" },
    ];
    render(<Sources sources={sources} />);
    const link = screen.getByRole("link", { name: /A Wiki of Ice and Fire/ });
    expect(link.getAttribute("href")).toBe(
      "https://awoiaf.westeros.org/index.php/Stark",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.textContent).toContain("CC-BY-SA-4.0");
  });

  it("uses the provided license when one is set", () => {
    const sources: Source[] = [
      {
        type: "awoiaf",
        url: "https://awoiaf.westeros.org/x",
        license: "CC-BY-4.0",
      },
    ];
    render(<Sources sources={sources} />);
    expect(screen.getByRole("link").textContent).toContain("CC-BY-4.0");
  });

  it("renders non-awoiaf sources as plain spans, preferring `ref` over `url` over `type`", () => {
    const sources: Source[] = [
      { type: "book", ref: "AGOT, ch. 1" },
      { type: "book", url: "https://example.com/book" },
      { type: "show" },
    ];
    render(<Sources sources={sources} />);
    expect(screen.getByText("AGOT, ch. 1").tagName).toBe("SPAN");
    expect(screen.getByText("https://example.com/book").tagName).toBe("SPAN");
    expect(screen.getByText("show").tagName).toBe("SPAN");
  });

  it("falls back to a span when an awoiaf source has no url", () => {
    const sources: Source[] = [{ type: "awoiaf", ref: "AWOIAF (no url)" }];
    render(<Sources sources={sources} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("AWOIAF (no url)").tagName).toBe("SPAN");
  });
});
