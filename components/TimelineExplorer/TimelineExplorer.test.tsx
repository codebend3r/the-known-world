import { afterEach, beforeEach, describe, it, expect, jest } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimelineExplorer } from "@/components/TimelineExplorer";
import { prepareTimeline } from "@/lib/timeline";
import type { Battle } from "@/lib/schemas";

const makeBattle = ({
  slug,
  year,
  region,
}: {
  slug: string;
  year: number;
  region?: Battle["region"];
}): Battle => ({
  slug,
  name: slug,
  type: "battle",
  start: { year, era: "AC", precision: "exact" },
  end: { year, era: "AC", precision: "exact" },
  region,
  participants: [],
  commanders: [],
  casualties: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
});

// Two battles six years apart: clustered at the base scale, pulled apart once
// the vertical scale grows past the cluster gap.
const source = prepareTimeline({
  battles: [
    makeBattle({ slug: "aaa", year: 300, region: "north" }),
    makeBattle({ slug: "bbb", year: 306, region: "north" }),
  ],
});

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("TimelineExplorer", () => {
  it("renders zoom controls at the default 1x level", () => {
    render(<TimelineExplorer source={source} />);
    expect(screen.getByRole("group", { name: /timeline zoom/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeDefined();
    expect(screen.getByText("1×")).toBeDefined();
  });

  it("groups near-simultaneous events into a cluster by default", () => {
    render(<TimelineExplorer source={source} />);
    expect(screen.getByRole("button", { name: /2 events/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /aaa/i })).toBeNull();
  });

  it("breaks the cluster into individual entries as the user zooms in", () => {
    render(<TimelineExplorer source={source} />);
    const zoomIn = screen.getByRole("button", { name: /zoom in/i });
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    expect(screen.queryByRole("button", { name: /2 events/i })).toBeNull();
    expect(screen.getByRole("link", { name: /aaa/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /bbb/i })).toBeDefined();
  });

  it("advances the readout and disables zoom-in at the 16× ceiling", () => {
    render(<TimelineExplorer source={source} />);
    const zoomIn = screen.getByRole("button", { name: /zoom in/i });
    // Default is 1× (index 1); step up through 2 / 4 / 8 / 16.
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    fireEvent.click(zoomIn);
    expect(screen.getByText("16×")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /zoom in/i }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("disables zoom-out at the floor", () => {
    render(<TimelineExplorer source={source} />);
    fireEvent.click(screen.getByRole("button", { name: /zoom out/i }));
    expect(screen.getByText("0.5×")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: /zoom out/i })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
