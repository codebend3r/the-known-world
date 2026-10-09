import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapLayerToggle } from "@/components/MapLayerToggle";
import { MAP_LAYERS } from "@/lib/map";
import { expectElement } from "@/test/dom";

describe("MapLayerToggle", () => {
  it("renders one checkbox per layer, with the layer name as the label", () => {
    render(<MapLayerToggle enabled={new Set()} onToggle={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(MAP_LAYERS.length);
    MAP_LAYERS.forEach((layer) => {
      expect(screen.getByText(layer)).toBeDefined();
    });
  });

  it("gives battles and events layers of their own", () => {
    render(<MapLayerToggle enabled={new Set()} onToggle={() => {}} />);
    expect(screen.getByText("battle")).toBeDefined();
    expect(screen.getByText("event")).toBeDefined();
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
        expectElement({
          element: label.querySelector("input[type='checkbox']"),
          type: HTMLInputElement,
        }),
      ]),
    );
    expect(byType.get("castle")?.checked ?? null).toBe(true);
    expect(byType.get("watchtower")?.checked ?? null).toBe(true);
    expect(byType.get("town")?.checked ?? null).toBe(false);
    expect(byType.get("ruin")?.checked ?? null).toBe(false);
    expect(byType.get("holdfast")?.checked ?? null).toBe(false);
    expect(byType.get("battle")?.checked ?? null).toBe(false);
    expect(byType.get("event")?.checked ?? null).toBe(false);
  });

  it("checks the battle and event inputs when those layers are enabled", () => {
    const { container } = render(
      <MapLayerToggle
        enabled={new Set(["battle", "event"])}
        onToggle={() => {}}
      />,
    );
    const byType = new Map<string, HTMLInputElement>(
      Array.from(container.querySelectorAll("label")).map((label) => [
        label.textContent ?? "",
        expectElement({
          element: label.querySelector("input[type='checkbox']"),
          type: HTMLInputElement,
        }),
      ]),
    );
    expect(byType.get("battle")?.checked ?? null).toBe(true);
    expect(byType.get("event")?.checked ?? null).toBe(true);
    expect(byType.get("castle")?.checked ?? null).toBe(false);
  });

  it("calls `onToggle` with the layer for the battle checkbox", () => {
    const onToggle = jest.fn();
    render(<MapLayerToggle enabled={new Set()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "battle" }));
    expect(onToggle).toHaveBeenCalledWith("battle");
  });

  it("calls `onToggle` with the type when its checkbox changes", () => {
    const onToggle = jest.fn();
    render(<MapLayerToggle enabled={new Set()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "ruin" }));
    expect(onToggle).toHaveBeenCalledWith("ruin");
  });

  it("exposes itself as a labelled group for assistive tech", () => {
    render(<MapLayerToggle enabled={new Set()} onToggle={() => {}} />);
    const group = screen.getByRole("group", { name: /map layers/i });
    expect(group).toBeDefined();
  });
});
