import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapLayerToggle } from "@/components/MapLayerToggle";
import { ALL_CASTLE_TYPES } from "@/lib/map";

describe("MapLayerToggle", () => {
  it("renders one checkbox per castle type, with the type name as the label", () => {
    render(<MapLayerToggle enabled={new Set()} onToggle={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(ALL_CASTLE_TYPES.length);
    ALL_CASTLE_TYPES.forEach((type) => {
      expect(screen.getByText(type)).toBeDefined();
    });
  });

  it("checks the input iff `enabled` includes that type", () => {
    const { container } = render(
      <MapLayerToggle
        enabled={new Set(["castle", "watchtower"])}
        onToggle={() => {}}
      />,
    );
    const byType = new Map<string, HTMLInputElement>(
      Array.from(container.querySelectorAll("label")).map((label) => [
        label.textContent ?? "",
        label.querySelector("input[type='checkbox']") as HTMLInputElement,
      ]),
    );
    expect(byType.get("castle")?.checked).toBe(true);
    expect(byType.get("watchtower")?.checked).toBe(true);
    expect(byType.get("town")?.checked).toBe(false);
    expect(byType.get("ruin")?.checked).toBe(false);
    expect(byType.get("holdfast")?.checked).toBe(false);
  });

  it("calls `onToggle` with the type when its checkbox changes", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <MapLayerToggle enabled={new Set()} onToggle={onToggle} />,
    );
    const ruinLabel = Array.from(container.querySelectorAll("label")).find(
      (label) => label.textContent === "ruin",
    );
    const ruinInput = ruinLabel?.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    fireEvent.click(ruinInput);
    expect(onToggle).toHaveBeenCalledWith("ruin");
  });

  it("exposes itself as a labelled group for assistive tech", () => {
    render(<MapLayerToggle enabled={new Set()} onToggle={() => {}} />);
    const group = screen.getByRole("group", { name: /map layers/i });
    expect(group).toBeDefined();
  });
});
