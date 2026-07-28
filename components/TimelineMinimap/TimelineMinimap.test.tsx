import { afterEach, describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimelineMinimap } from "@/components/TimelineMinimap";
import type { TimelineTick } from "@/lib/timeline";

const ticks: TimelineTick[] = [
  { y: 48, label: "12000 BC" },
  { y: 500, label: "5000 BC" },
  { y: 24048, label: "Aegon's Conquest" },
];

function renderMinimap() {
  render(
    <>
      <div id="chart-body" />
      <TimelineMinimap ticks={ticks} targetId="chart-body" />
    </>,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("TimelineMinimap", () => {
  it("renders a jump button per tick inside a labelled nav", () => {
    renderMinimap();
    expect(
      screen.getByRole("navigation", { name: /jump to year/i }),
    ).toBeDefined();
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "12000 BC",
      "5000 BC",
      "Aegon's Conquest",
    ]);
  });

  it("smooth-scrolls to the tick position on click", () => {
    const scrollTo = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    renderMinimap();
    fireEvent.click(screen.getByRole("button", { name: "5000 BC" }));
    expect(scrollTo).toHaveBeenCalledWith({
      top: 500 - 120,
      behavior: "smooth",
    });
  });

  it("clamps the scroll target at the top of the page", () => {
    const scrollTo = jest
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    renderMinimap();
    fireEvent.click(screen.getByRole("button", { name: "12000 BC" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
