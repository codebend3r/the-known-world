import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.credit}>
          Built by <span className={styles.name}>CJ Rivas</span>
          <span className={styles.separator} aria-hidden="true">·</span>
          <a
            className={styles.link}
            href="https://github.com/codebend3r"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/codebend3r
          </a>
        </p>
      </div>
    </footer>
  );
}
