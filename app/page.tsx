import { PlateLayout } from "@/components/PlateLayout";
import { MainMenu } from "@/components/MainMenu";
import { FiligreeRule } from "@/components/Filigree";
import styles from "@/app/page.module.scss";

export default function Home() {
  return (
    <PlateLayout>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>A Chronicle of A Song of Ice and Fire</p>
        <h1 className={styles.title}>The Known World</h1>
        <FiligreeRule variant="scroll" fade="both" className={styles.rule} />
        <p className={styles.lede}>
          Every house, every war, every dragon of the lands of Ice and Fire,
          gathered into one dark atlas.
        </p>
      </section>
      <div className={styles.indexBar}>
        <h2 className={styles.indexLabel}>The Index</h2>
        <p className={styles.indexCount}>08 collections</p>
      </div>
      <MainMenu />
    </PlateLayout>
  );
}
