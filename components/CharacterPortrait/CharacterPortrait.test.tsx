import { describe, expect, it, spyOn } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { CharacterPortrait } from "@/components/CharacterPortrait";

const PROPS = {
  image: "/characters/jon-snow.jpg",
  video: "/characters/jon-snow.mp4",
  alt: "Portrait of Jon Snow",
};

function renderPortrait() {
  const { container } = render(<CharacterPortrait {...PROPS} />);
  const media = container.firstElementChild;
  if (!(media instanceof HTMLElement)) throw new Error("expected a container");
  const video = container.querySelector("video");
  if (!video) throw new Error("expected a video element");
  return { media, video, image: screen.getByAltText(PROPS.alt) };
}

describe("CharacterPortrait", () => {
  it("renders only the still when the character has no video", () => {
    const { container } = render(<CharacterPortrait {...PROPS} video={null} />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByAltText(PROPS.alt).getAttribute("src")).toBe(
      PROPS.image,
    );
  });

  it("renders the still on load with the clip preloading behind it", () => {
    const { video, image } = renderPortrait();
    expect(image.getAttribute("src")).toBe(PROPS.image);
    expect(image.className).not.toContain("imagePlaying");
    expect(video.getAttribute("src")).toBe(PROPS.video);
    expect(video.getAttribute("preload")).toBe("auto");
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.getAttribute("aria-hidden")).toBe("true");
  });

  it("plays the clip and fades the still on hover", () => {
    const { media, video, image } = renderPortrait();
    const play = spyOn(video, "play").mockResolvedValue(undefined);

    fireEvent.mouseOver(media);

    expect(play).toHaveBeenCalledTimes(1);
    expect(image.className).toContain("imagePlaying");
  });

  it("pauses, rewinds, and restores the still when the hover ends", () => {
    const { media, video, image } = renderPortrait();
    spyOn(video, "play").mockResolvedValue(undefined);
    const pause = spyOn(video, "pause").mockImplementation(() => {});

    fireEvent.mouseOver(media);
    video.currentTime = 3;
    fireEvent.mouseOut(media);

    expect(pause).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
    expect(image.className).not.toContain("imagePlaying");
  });

  it("swallows the rejection when the hover ends before playback starts", () => {
    const { media, video } = renderPortrait();
    spyOn(video, "play").mockRejectedValue(new Error("interrupted"));

    expect(() => fireEvent.mouseOver(media)).not.toThrow();
  });

  it("keeps the still in place when reduced motion is preferred", () => {
    const { media, video, image } = renderPortrait();
    const play = spyOn(video, "play").mockResolvedValue(undefined);
    Object.defineProperty(window, "matchMedia", {
      value: () => ({ matches: true }),
      configurable: true,
      writable: true,
    });

    try {
      fireEvent.mouseOver(media);
    } finally {
      Object.defineProperty(window, "matchMedia", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }

    expect(play).not.toHaveBeenCalled();
    expect(image.className).not.toContain("imagePlaying");
  });
});
