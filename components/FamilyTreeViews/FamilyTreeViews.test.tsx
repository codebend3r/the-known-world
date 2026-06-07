import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FamilyTreeViewSwitcher } from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";

function hiddenAttr(el: HTMLElement | null): string | null {
  return el ? el.getAttribute("hidden") : null;
}

function setUrl(search: string) {
  window.history.replaceState(null, "", `/houses/stark/${search}`);
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })),
  );
}

describe("FamilyTreeViewSwitcher", () => {
  beforeEach(() => {
    setUrl("");
  });

  afterEach(() => {
    setUrl("");
    vi.unstubAllGlobals();
  });

  it("shows the list view child by default", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
    expect(
      hiddenAttr(screen.getByTestId("chart").parentElement),
    ).not.toBeNull();
  });

  it("shows the chart view when ?tree=chart", () => {
    setUrl("?tree=chart");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("chart").parentElement)).toBeNull();
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).not.toBeNull();
  });

  it("falls back to the list view when ?tree is invalid", () => {
    setUrl("?tree=bogus");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    expect(hiddenAttr(screen.getByTestId("list").parentElement)).toBeNull();
  });

  it("clicking the chart toggle button writes ?tree=chart to the URL", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chart view/i }));
    expect(window.location.search).toBe("?tree=chart");
  });

  it("clicking the list toggle button strips ?tree from the URL", () => {
    setUrl("?tree=chart");
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(window.location.search).toBe("");
  });

  it("re-renders when the URL changes externally", () => {
    render(
      <FamilyTreeViewSwitcher
        list={<div data-testid="list">list</div>}
        chart={<div data-testid="chart">chart</div>}
      />,
    );
    act(() => {
      setUrl("?tree=chart");
      window.dispatchEvent(new Event("tkw:urlchange"));
    });
    expect(hiddenAttr(screen.getByTestId("chart").parentElement)).toBeNull();
  });

  describe("on mobile", () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it("renders the chart without the toggle and without the list", () => {
      render(
        <FamilyTreeViewSwitcher
          list={<div data-testid="list">list</div>}
          chart={<div data-testid="chart">chart</div>}
        />,
      );
      expect(screen.getByTestId("chart")).toBeDefined();
      expect(screen.queryByTestId("list")).toBeNull();
      expect(screen.queryByRole("button", { name: /chart view/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /list view/i })).toBeNull();
    });

    it("renders the chart even when ?tree=list is in the URL", () => {
      setUrl("?tree=list");
      render(
        <FamilyTreeViewSwitcher
          list={<div data-testid="list">list</div>}
          chart={<div data-testid="chart">chart</div>}
        />,
      );
      expect(screen.getByTestId("chart")).toBeDefined();
      expect(screen.queryByTestId("list")).toBeNull();
    });
  });
});
