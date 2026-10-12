import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapLayerToggle } from "@/components/MapLayerToggle";
import { MAP_LAYERS } from "@/lib/map";
import { expectElement } from "@/test/dom";

function checkbox(layer: string): HTMLInputElement {
  return expectElement({
    element: screen.getByRole("checkbox", { name: layer }),
    type: HTMLInputElement,
  });
}

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
    render(
      <MapLayerToggle
        enabled={new Set(["castle", "watchtower"])}
        onToggle={() => {}}
      />,
    );
    expect(checkbox("castle").checked).toBe(true);
    expect(checkbox("watchtower").checked).toBe(true);
    expect(checkbox("town").checked).toBe(false);
    expect(checkbox("ruin").checked).toBe(false);
    expect(checkbox("holdfast").checked).toBe(false);
    expect(checkbox("battle").checked).toBe(false);
    expect(checkbox("event").checked).toBe(false);
  });

  it("checks the battle and event inputs when those layers are enabled", () => {
    render(
      <MapLayerToggle
        enabled={new Set(["battle", "event"])}
        onToggle={() => {}}
      />,
    );
    expect(checkbox("battle").checked).toBe(true);
    expect(checkbox("event").checked).toBe(true);
    expect(checkbox("castle").checked).toBe(false);
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
