import Link from "next/link";
import {
  LANDMASSES,
  LANDMASS_LABELS,
  type Landmass,
  type TimelineModel,
  type TimelineNode,
} from "@/lib/timeline";
import {
  TimelineCluster,
  TimelineClusterProvider,
} from "@/components/TimelineCluster";
import styles from "@/components/TimelineChart/TimelineChart.module.scss";

type TimelineChartProps = {
  model: TimelineModel;
  bodyId?: string;
};

const COLUMN_CLASS: Record<Landmass, string> = {
  westeros: styles.columnWesteros,
  essos: styles.columnEssos,
  "summer-isles": styles.columnSummerIsles,
};

function ChartNode({ node }: { node: TimelineNode }) {
  if (node.kind === "cluster") {
    return (
      <div className={styles.node} style={{ top: node.y }}>
        <TimelineCluster
          label={node.label}
          when={node.when}
          events={node.events}
        />
      </div>
    );
  }
  return (
    <div className={styles.node} style={{ top: node.y }}>
      <Link href={node.event.href} className={styles.event}>
        <span className={styles.marker} aria-hidden="true" />
        <span className={styles.eventName}>{node.event.name}</span>
        <span className={styles.eventWhen}>{node.event.when}</span>
      </Link>
    </div>
  );
}

export function TimelineChart({ model, bodyId }: TimelineChartProps) {
  return (
    <div className={styles.scroller}>
      <div className={styles.chart}>
        <header className={styles.header}>
          <span className={styles.axisSpacer} aria-hidden="true" />
          {LANDMASSES.map((landmass) => (
            <h2 key={landmass} className={styles.columnHeading}>
              {LANDMASS_LABELS[landmass]}
            </h2>
          ))}
        </header>
        <div
          id={bodyId}
          className={styles.body}
          style={{ height: model.height }}
        >
          {model.eras.map((era) => (
            <div
              key={era.label}
              className={styles.era}
              style={{ top: era.top, height: era.height }}
            >
              <span className={styles.eraLabel}>{era.label}</span>
            </div>
          ))}
          {model.ticks.map((tick) => (
            <div
              key={tick.label}
              className={styles.tick}
              style={{ top: tick.y }}
            >
              <span className={styles.tickLabel}>{tick.label}</span>
            </div>
          ))}
          <TimelineClusterProvider>
            <div className={styles.columns}>
              <span className={styles.axisRail} aria-hidden="true" />
              {LANDMASSES.map((landmass) => (
                <section
                  key={landmass}
                  className={COLUMN_CLASS[landmass]}
                  aria-label={LANDMASS_LABELS[landmass]}
                >
                  {model.columns[landmass].map((node) => (
                    <ChartNode
                      key={
                        node.kind === "single"
                          ? node.event.slug
                          : `cluster-${node.y}`
                      }
                      node={node}
                    />
                  ))}
                </section>
              ))}
            </div>
          </TimelineClusterProvider>
        </div>
      </div>
    </div>
  );
}
