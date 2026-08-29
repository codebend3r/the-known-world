import { describe, it, expect, jest } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useDebouncedSearch } from "@/lib/useDebouncedSearch";

function Probe({
  urlValue,
  commit,
}: {
  urlValue: string;
  commit: (search: string) => void;
}) {
  const { value, debounced, onChange } = useDebouncedSearch({
    urlValue,
    commit,
  });
  return (
    <>
      <input
        aria-label="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <output>{debounced}</output>
    </>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("useDebouncedSearch", () => {
  it("starts from the URL so a shared ?search= filters on first paint", () => {
    render(<Probe urlValue="stark" commit={() => {}} />);
    expect(screen.getByLabelText("search").getAttribute("value")).toBe("stark");
    expect(screen.getByText("stark")).toBeDefined();
  });

  it("shows typing at once but holds the filter until the pause", async () => {
    render(<Probe urlValue="" commit={() => {}} />);
    fireEvent.change(screen.getByLabelText("search"), {
      target: { value: "tul" },
    });
    expect(screen.getByLabelText("search").getAttribute("value")).toBe("tul");
    expect(screen.queryByText("tul")).toBeNull();
    await advance(400);
    expect(screen.getByText("tul")).toBeDefined();
  });

  it("commits once for a burst of keystrokes", async () => {
    const commit = jest.fn();
    render(<Probe urlValue="" commit={commit} />);
    const input = screen.getByLabelText("search");
    fireEvent.change(input, { target: { value: "t" } });
    fireEvent.change(input, { target: { value: "tu" } });
    fireEvent.change(input, { target: { value: "tul" } });
    await advance(400);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("tul");
  });

  // The reason `commit` is held in a ref: callers pass an inline arrow that is
  // a new function every render, and a dependency on it would re-commit.
  it("does not re-commit when the caller passes a fresh closure each render", async () => {
    const spy = jest.fn();
    function Wrapper() {
      return <Probe urlValue="" commit={(next) => spy(next)} />;
    }
    const { rerender } = render(<Wrapper />);
    fireEvent.change(screen.getByLabelText("search"), {
      target: { value: "arya" },
    });
    await advance(400);
    expect(spy).toHaveBeenCalledTimes(1);
    rerender(<Wrapper />);
    rerender(<Wrapper />);
    await advance(400);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("commits an empty string when the field is cleared", async () => {
    const commit = jest.fn();
    render(<Probe urlValue="stark" commit={commit} />);
    fireEvent.change(screen.getByLabelText("search"), {
      target: { value: "" },
    });
    await advance(400);
    expect(commit).toHaveBeenCalledWith("");
  });
});
