import { PlateLayout } from "@/components/PlateLayout";
import { MainMenu } from "@/components/MainMenu";
import styles from "@/app/page.module.scss";

export default function Home() {
  return (
    <PlateLayout>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>A chronicle of fire and blood</p>
        <h1 className={styles.title}>The Known World</h1>
        <p className={styles.rule} aria-hidden="true">
          <span className={styles.ruleLine} />
          <span className={styles.ruleMark}>✦</span>
          <span className={styles.ruleLine} />
        </p>
        <p className={styles.lede}>
          Every house, every war, every dragon of the lands of Ice and Fire,
          gathered into one dark atlas.
        </p>
      </section>
      <div className={styles.indexBar}>
        <h2 className={styles.indexLabel}>The Index</h2>
        <p className={styles.indexCount}>07 collections</p>
      </div>
      <MainMenu />
    </PlateLayout>
  );
}
