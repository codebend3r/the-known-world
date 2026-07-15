import { ParchmentLayout } from "@/components/ParchmentLayout";
import { MainMenu } from "@/components/MainMenu";
import { FiligreeRule } from "@/components/Filigree";
import styles from "@/app/page.module.scss";

export default function Home() {
  return (
    <ParchmentLayout>
      <section className={styles.contents}>
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>A Song of Ice and Fire</p>
          <h1 className={styles.title}>Table of Plates</h1>
          <FiligreeRule className={styles.rule} />
          <p className={styles.lede}>
            The realm surveyed from the Wall to the Summer Sea, engraved plate
            by plate. Open one to begin.
          </p>
        </header>
        <MainMenu />
      </section>
    </ParchmentLayout>
  );
}
