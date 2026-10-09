import fs from "node:fs/promises";
import path from "node:path";

const GLOBALS_PATH = path.join(process.cwd(), "styles", "globals.scss");

// Values may wrap across lines (`--tkw-glow`, `--tkw-banner`), so a value runs
// to its semicolon rather than the end of the line.
const DECLARATION = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm;

export type DesignTokens = {
  /** The `:root` block exactly as `styles/globals.scss` declares it. */
  source: string;
  /** A token's declared value, whitespace collapsed. Throws if undeclared. */
  value: (name: string) => string;
};

export function parseDesignTokens(scss: string): DesignTokens {
  const start = scss.indexOf(":root {");
  const end = start === -1 ? -1 : scss.indexOf("\n}", start);
  if (end === -1) {
    throw new Error("The stylesheet has no `:root { … }` block");
  }

  const source = scss.slice(start, end + "\n}".length);
  const values = new Map(
    [...source.matchAll(DECLARATION)].map(([, name, value]) => [
      name,
      value.replace(/\s+/g, " ").trim(),
    ]),
  );

  return {
    source,
    value: (name) => {
      const declared = values.get(name);
      if (declared === undefined) {
        throw new Error(`${name} is not declared in the \`:root\` block`);
      }
      return declared;
    },
  };
}

/** The live tokens from `styles/globals.scss`, read at build time. */
export async function loadDesignTokens(): Promise<DesignTokens> {
  return parseDesignTokens(await fs.readFile(GLOBALS_PATH, "utf8"));
}
