import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";
import { fireEvent, screen } from "@testing-library/react";
import { FamilyTreeViewSwitcher } from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";
import { renderWithNuqs, flushNuqs, lastQueryString } from "@/lib/testNuqs";

function hiddenAttr(el: HTMLElement | null): string | null {
  return el ? el.getAttribute("hidden") : null;
}

function mockMatchMedia(matches: boolean) {
  stubGlobal({
    name: "matchMedia",
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })),
  });
}

const list = <div data-testid="list">list</div>;
const chart = <div data-testid="chart">chart</div>;

describe("FamilyTreeViewSwitcher", () => {
  afterEach(() => {
    unstubAllGlobals();
  });

  it("shows the list view child by default", () => {
    renderWithNuqs(<FamilyTreeViewSwitcher list={list} chart={chart} />);
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
    expect(
      hiddenAttr(screen.getByTestId("chart").parentElement),
    ).not.toBeNull();
  });

  it("shows the chart view when ?tree=chart", () => {
    renderWithNuqs(<FamilyTreeViewSwitcher list={list} chart={chart} />, {
      searchParams: "?tree=chart",
    });
    expect(hiddenAttr(screen.getByTestId("chart").parentElement)).toBeNull();
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).not.toBeNull();
  });

  it("falls back to the list view when ?tree is invalid", () => {
    renderWithNuqs(<FamilyTreeViewSwitcher list={list} chart={chart} />, {
      searchParams: "?tree=bogus",
    });
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
  });

  it("clicking the chart toggle button writes ?tree=chart to the URL", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FamilyTreeViewSwitcher list={list} chart={chart} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chart view/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("?tree=chart");
  });

  it("clicking the list toggle button strips ?tree from the URL", async () => {
    const { onUrlUpdate } = renderWithNuqs(
      <FamilyTreeViewSwitcher list={list} chart={chart} />,
      { searchParams: "?tree=chart" },
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    await flushNuqs();
    expect(lastQueryString(onUrlUpdate)).toBe("");
  });

  describe("on mobile", () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it("renders the chart without the toggle and without the list", () => {
      renderWithNuqs(<FamilyTreeViewSwitcher list={list} chart={chart} />);
      expect(screen.getByTestId("chart")).toBeDefined();
      expect(screen.queryByTestId("list")).toBeNull();
      expect(screen.queryByRole("button", { name: /chart view/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /list view/i })).toBeNull();
    });

    it("renders the chart even when ?tree=list is in the URL", () => {
      renderWithNuqs(<FamilyTreeViewSwitcher list={list} chart={chart} />, {
        searchParams: "?tree=list",
      });
      expect(screen.getByTestId("chart")).toBeDefined();
      expect(screen.queryByTestId("list")).toBeNull();
    });
  });
});
