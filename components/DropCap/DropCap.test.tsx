import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DropCap } from "@/components/DropCap";

describe("DropCap", () => {
  it("renders its children inside a paragraph with the dropCap class", () => {
    render(<DropCap>Hark!</DropCap>);
    const p = screen.getByText("Hark!");
    expect(p.tagName).toBe("P");
    expect(p.className).toBe("dropCap");
  });
});
