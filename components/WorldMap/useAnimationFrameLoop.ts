import { useEffect, useRef } from "react";

/**
 * Runs `onFrame` on every animation frame while `isActive`. `onFrame` is read
 * through a ref, so a caller can pass an inline closure over its latest render
 * without restarting the loop each time that closure changes identity.
 */
export function useAnimationFrameLoop({
  isActive,
  onFrame,
}: {
  isActive: boolean;
  onFrame: () => void;
}): void {
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    if (!isActive) return;
    let frame = 0;
    const tick = () => {
      onFrameRef.current();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isActive]);
}
