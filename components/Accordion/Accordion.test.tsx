import { describe, it, expect, jest } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { Accordion } from "@/components/Accordion";

describe("Accordion", () => {
  it("hides its children and marks the trigger collapsed when closed", () => {
    render(
      <Accordion id="north" title="The North" open={false} onToggle={() => {}}>
        <p>hidden body</p>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: /the north/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("hidden body")).toBeNull();
  });

  it("renders its children inside a labelled region when open", () => {
    render(
      <Accordion id="north" title="The North" open onToggle={() => {}}>
        <p>visible body</p>
      </Accordion>,
    );
    expect(
      screen
        .getByRole("button", { name: /the north/i })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("visible body")).toBeDefined();
    expect(screen.getByRole("region", { name: /the north/i })).toBeDefined();
  });

  it("calls onToggle when the trigger is clicked", () => {
    const onToggle = jest.fn();
    render(
      <Accordion id="north" title="The North" open={false} onToggle={onToggle}>
        <p>body</p>
      </Accordion>,
    );
    fireEvent.click(screen.getByRole("button", { name: /the north/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders an optional count", () => {
    render(
      <Accordion
        id="north"
        title="The North"
        count={42}
        open
        onToggle={() => {}}
      >
        <p>body</p>
      </Accordion>,
    );
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders the requested heading level", () => {
    const { container } = render(
      <Accordion
        id="north"
        title="The North"
        headingLevel={2}
        open={false}
        onToggle={() => {}}
      >
        <p>body</p>
      </Accordion>,
    );
    expect(container.querySelector("h2")).not.toBeNull();
  });
});
