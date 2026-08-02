import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { PlateLayout } from "@/components/PlateLayout";

describe("PlateLayout", () => {
  it("renders its children inside a `main` landmark with the page class", () => {
    render(
      <PlateLayout>
        <p>contents</p>
      </PlateLayout>,
    );
    const main = screen.getByRole("main");
    expect(main.tagName).toBe("MAIN");
    expect(main.className).toBe("page");
    expect(main.textContent).toBe("contents");
  });
});
