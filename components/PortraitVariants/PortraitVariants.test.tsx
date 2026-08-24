import { describe, expect, it, beforeEach } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { PortraitVariants } from "@/components/PortraitVariants";
import type { PortraitVariant } from "@/lib/portrait-variants";
import { SPOILERS_STORAGE_KEY } from "@/lib/spoilers";

const PRIMARY: PortraitVariant = {
  id: "duncan-the-tall",
  label: "Duncan the Tall",
  image: "/characters/duncan-the-tall/duncan-the-tall.jpg",
  video: "/characters/duncan-the-tall/duncan-the-tall.mp4",
  isPrimary: true,
};

const KINGSGUARD: PortraitVariant = {
  id: "duncan-the-tall-kingsguard",
  label: "Kingsguard",
  image: "/characters/duncan-the-tall/duncan-the-tall-kingsguard.jpg",
  video: "/characters/duncan-the-tall/duncan-the-tall-kingsguard.mp4",
  isPrimary: false,
};

const ASHFORD: PortraitVariant = {
  ...KINGSGUARD,
  id: "duncan-the-tall-ashford",
  label: "Ashford",
  image: "/characters/duncan-the-tall/duncan-the-tall-ashford.jpg",
  video: null,
};

function renderVariants(variants: PortraitVariant[] = [PRIMARY, KINGSGUARD]) {
  return render(
    <PortraitVariants variants={variants} name="Duncan the Tall" />,
  );
}

function spoilersOn() {
  window.localStorage.setItem(SPOILERS_STORAGE_KEY, "on");
}

describe("PortraitVariants", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nothing when the character has no portrait at all", () => {
    const { container } = render(
      <PortraitVariants variants={[]} name="Nobody" />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it("shows the primary and no switcher when spoilers are off", () => {
    renderVariants();
    expect(
      screen.getByAltText("Portrait of Duncan the Tall").getAttribute("src"),
    ).toBe(PRIMARY.image);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("renders no variant label while spoilers are off", () => {
    const { container } = renderVariants();
    expect(container.innerHTML).not.toContain("Kingsguard");
  });

  it("shows no switcher for a character with a single portrait", () => {
    spoilersOn();
    renderVariants([PRIMARY]);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("offers every variant as a tab once spoilers are on", () => {
    spoilersOn();
    renderVariants();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Duncan the Tall",
      "Kingsguard",
    ]);
    expect(screen.getByRole("tablist").getAttribute("aria-label")).toBe(
      "Portraits of Duncan the Tall",
    );
  });

  it("opens on the primary, not on a later life", () => {
    spoilersOn();
    renderVariants();
    const [primary, kingsguard] = screen.getAllByRole("tab");
    expect(primary?.getAttribute("aria-selected")).toBe("true");
    expect(kingsguard?.getAttribute("aria-selected")).toBe("false");
  });

  it("swaps the still and the clip when a variant is chosen", () => {
    spoilersOn();
    const { container } = renderVariants();
    fireEvent.click(screen.getByRole("tab", { name: "Kingsguard" }));
    expect(
      screen
        .getByAltText("Portrait of Duncan the Tall — Kingsguard")
        .getAttribute("src"),
    ).toBe(KINGSGUARD.image);
    expect(container.querySelector("video")?.getAttribute("src")).toBe(
      KINGSGUARD.video,
    );
  });

  it("drops the clip for a variant that has no video", () => {
    spoilersOn();
    const { container } = renderVariants([PRIMARY, ASHFORD]);
    fireEvent.click(screen.getByRole("tab", { name: "Ashford" }));
    expect(container.querySelector("video")).toBeNull();
  });

  it("points the panel at the tab that selected it", () => {
    spoilersOn();
    const { container } = renderVariants();
    fireEvent.click(screen.getByRole("tab", { name: "Kingsguard" }));
    const panel = container.querySelector('[role="tabpanel"]');
    if (!panel) throw new Error("expected a tabpanel");
    const selected = screen.getByRole("tab", { name: "Kingsguard" });
    expect(panel.getAttribute("aria-labelledby")).toBe(selected.id);
    expect(selected.getAttribute("aria-controls")).toBe(panel.id);
  });

  it("keeps only the selected tab in the tab order", () => {
    spoilersOn();
    renderVariants();
    fireEvent.click(screen.getByRole("tab", { name: "Kingsguard" }));
    expect(
      screen.getAllByRole("tab").map((tab) => tab.getAttribute("tabindex")),
    ).toEqual(["-1", "0"]);
  });

  it("walks the tabs with the arrow keys and wraps around", () => {
    spoilersOn();
    renderVariants();
    const selected = () =>
      screen.getAllByRole("tab").find((tab) => tab.tabIndex === 0);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Duncan the Tall" }), {
      key: "ArrowRight",
    });
    expect(
      screen
        .getByRole("tab", { name: "Kingsguard" })
        .getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Kingsguard" }), {
      key: "ArrowRight",
    });
    expect(selected()?.textContent).toBe("Duncan the Tall");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Duncan the Tall" }), {
      key: "ArrowLeft",
    });
    expect(
      screen
        .getByRole("tab", { name: "Kingsguard" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("jumps to the first and last variant with Home and End", () => {
    spoilersOn();
    renderVariants([PRIMARY, ASHFORD, KINGSGUARD]);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Duncan the Tall" }), {
      key: "End",
    });
    expect(
      screen
        .getByRole("tab", { name: "Kingsguard" })
        .getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Kingsguard" }), {
      key: "Home",
    });
    expect(
      screen
        .getByRole("tab", { name: "Duncan the Tall" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("leaves other keys to the browser", () => {
    spoilersOn();
    renderVariants();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Duncan the Tall" }), {
      key: "Tab",
    });
    expect(
      screen
        .getByRole("tab", { name: "Duncan the Tall" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("falls back to the primary when spoilers are switched off mid-view", () => {
    spoilersOn();
    renderVariants();
    fireEvent.click(screen.getByRole("tab", { name: "Kingsguard" }));
    window.localStorage.setItem(SPOILERS_STORAGE_KEY, "off");
    fireEvent(
      window,
      new StorageEvent("storage", { key: SPOILERS_STORAGE_KEY }),
    );

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(
      screen.getByAltText("Portrait of Duncan the Tall").getAttribute("src"),
    ).toBe(PRIMARY.image);
  });
});
