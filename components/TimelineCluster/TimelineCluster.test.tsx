import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimelineCluster } from "@/components/TimelineCluster";
import type { TimelineEvent } from "@/lib/timeline";

const events: TimelineEvent[] = [
  {
    slug: "battle-of-the-blackwater",
    name: "Battle of the Blackwater",
    href: "/battles/battle-of-the-blackwater/",
    year: 299,
    when: "299 AC",
  },
  {
    slug: "battle-of-oxcross",
    name: "Battle of Oxcross",
    href: "/battles/battle-of-oxcross/",
    year: 299,
    when: "299 AC",
  },
  {
    slug: "siege-of-meereen",
    name: "Siege of Meereen",
    href: "/battles/siege-of-meereen/",
    year: 300,
    when: "300 AC",
  },
];

function renderCluster() {
  render(
    <TimelineCluster label="3 events" when="299–300 AC" events={events} />,
  );
  return screen.getByRole("button", { name: /3 events/i });
}

describe("TimelineCluster", () => {
  it("renders collapsed: count pill, no event links", () => {
    const pill = renderCluster();
    expect(pill.getAttribute("aria-expanded")).toBe("false");
    expect(pill.textContent).toContain("299–300 AC");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("expands on hover to reveal one link per event", () => {
    const pill = renderCluster();
    fireEvent.mouseOver(pill);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute("href")).toBe(
      "/battles/battle-of-the-blackwater/",
    );
  });

  it("collapses when the pointer leaves", () => {
    const pill = renderCluster();
    fireEvent.mouseOver(pill);
    fireEvent.mouseOut(pill, { relatedTarget: document.body });
    expect(pill.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("toggles on click for keyboard activation", () => {
    const pill = renderCluster();
    fireEvent.click(pill);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(pill);
    expect(pill.getAttribute("aria-expanded")).toBe("false");
  });

  it("collapses on Escape", () => {
    const pill = renderCluster();
    fireEvent.click(pill);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(pill, { key: "Escape" });
    expect(pill.getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open while focus moves within the expanded list", () => {
    const pill = renderCluster();
    fireEvent.click(pill);
    const firstLink = screen.getAllByRole("link")[0];
    fireEvent.blur(pill, { relatedTarget: firstLink });
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    fireEvent.blur(firstLink, { relatedTarget: document.body });
    expect(pill.getAttribute("aria-expanded")).toBe("false");
  });
});
