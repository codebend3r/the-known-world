"use client";

import { useEffect, useRef, useState } from "react";
import { ReactSVGPanZoom, TOOL_AUTO, type Value } from "react-svg-pan-zoom";
import type { ReactNode } from "react";
import styles from "@/components/MapStage.module.scss";

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 1400;

type Props = {
  children: ReactNode;
  svgUrl: string;
};

export function MapStage({ children, svgUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [value, setValue] = useState<Value>({} as Value);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.stage}>
      <div className={styles.inner}>
        {size && (
          <ReactSVGPanZoom
            width={size.w}
            height={size.h}
            tool={TOOL_AUTO}
            onChangeTool={() => {}}
            value={value}
            onChangeValue={setValue}
            background="transparent"
            SVGBackground="transparent"
            detectAutoPan={false}
            scaleFactor={1.2}
            scaleFactorMin={0.5}
            scaleFactorMax={6}
            preventPanOutside={true}
            toolbarProps={{ position: "none" }}
            miniatureProps={{
              position: "none",
              background: "transparent",
              width: 0,
              height: 0,
            }}
          >
            <svg width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT}>
              <image
                href={svgUrl}
                x={0}
                y={0}
                width={VIEWBOX_WIDTH}
                height={VIEWBOX_HEIGHT}
              />
              {children}
            </svg>
          </ReactSVGPanZoom>
        )}
      </div>
    </div>
  );
}
