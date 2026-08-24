"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cx } from "@/lib/cx";
import styles from "@/components/CharacterPortrait/CharacterPortrait.module.scss";

type Props = {
  image: string;
  video: string | null;
  alt: string;
};

export function CharacterPortrait({ image, video, alt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseEnter = () => {
    const player = videoRef.current;
    if (!player) return;
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReducedMotion) return;
    setIsPlaying(true);
    // play() rejects when the hover ends before playback starts; that
    // interruption is routine, not a failure worth surfacing.
    player.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    const player = videoRef.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
    setIsPlaying(false);
  };

  return (
    <div
      className={styles.media}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* preload="auto" fetches the clip on page load so the hover never
          starts against an empty buffer. */}
      {video && (
        <video
          ref={videoRef}
          className={styles.video}
          src={video}
          preload="auto"
          muted
          loop
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <Image
        src={image}
        alt={alt}
        width={1200}
        height={800}
        sizes="(max-width: 768px) 100vw, 1100px"
        priority
        className={cx(styles.image, isPlaying && styles.imagePlaying)}
      />
    </div>
  );
}
