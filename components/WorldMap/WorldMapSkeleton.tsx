import styles from "@/components/WorldMap/WorldMap.module.scss";

export function WorldMapSkeleton() {
  return (
    <div className={styles.map}>
      <div className={styles.stage} />
      <p className={styles.hint}>
        Drag to pan · Scroll or pinch to zoom · Keys: + and − zoom, arrows pan,
        0 resets
      </p>
    </div>
  );
}
