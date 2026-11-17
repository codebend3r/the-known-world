import type { DesignTokens } from "@/lib/design-tokens";
import { DesignSection } from "@/app/design/_sections/DesignSection";
import shared from "@/app/design/_sections/DesignSection.module.scss";
import styles from "@/app/design/_sections/TokenSource.module.scss";

export function TokenSource({ tokens }: { tokens: DesignTokens }) {
  return (
    <DesignSection
      heading="06 · Tokens for the repo"
      lede={
        <>
          Declared in{" "}
          <code className={shared.inlineCode}>styles/globals.scss</code>.
          Consume them with{" "}
          <code className={shared.inlineCode}>var(--token)</code>; never
          hard-code a hex in a module.
        </>
      }
    >
      <pre className={styles.tokens}>
        <code>{tokens.source}</code>
      </pre>
    </DesignSection>
  );
}
