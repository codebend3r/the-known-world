import { describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapLayerToggle } from "@/components/MapLayerToggle";
import { MAP_LAYERS } from "@/lib/map";

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
        label.querySelector("input[type='checkbox']") as HTMLInputElement,
      ]),
    );
    expect(byType.get("castle")?.checked).toBe(true);
    expect(byType.get("watchtower")?.checked).toBe(true);
    expect(byType.get("town")?.checked).toBe(false);
    expect(byType.get("ruin")?.checked).toBe(false);
    expect(byType.get("holdfast")?.checked).toBe(false);
    expect(byType.get("battle")?.checked).toBe(false);
    expect(byType.get("event")?.checked).toBe(false);
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
        label.querySelector("input[type='checkbox']") as HTMLInputElement,
      ]),
    );
    expect(byType.get("battle")?.checked).toBe(true);
    expect(byType.get("event")?.checked).toBe(true);
    expect(byType.get("castle")?.checked).toBe(false);
  });

  it("calls `onToggle` with the layer for the battle checkbox", () => {
    const onToggle = jest.fn();
    const { container } = render(
      <MapLayerToggle enabled={new Set()} onToggle={onToggle} />,
    );
    const battleLabel = Array.from(container.querySelectorAll("label")).find(
      (label) => label.textContent === "battle",
    );
    const battleInput = battleLabel?.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    fireEvent.click(battleInput);
    expect(onToggle).toHaveBeenCalledWith("battle");
  });

  it("calls `onToggle` with the type when its checkbox changes", () => {
    const onToggle = jest.fn();
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
