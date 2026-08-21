/**
 * Static accessibility audit for `app/` and `components/`.
 *
 * The repo lints with `jsx-a11y` but switches seven of its rules off in
 * `.oxlintrc.json`, so the defects this reports are, by construction, the ones
 * CI cannot see. Every check here either replaces a disabled rule or covers a
 * surface no linter models: SVG canvases, combobox IDREFs, per-route heading
 * order, and token contrast.
 *
 * Run from the repo root:
 *
 *   bun .claude/skills/a11y-audit/audit-a11y.ts
 *   bun .claude/skills/a11y-audit/audit-a11y.ts --json
 *
 * Read-only. Writes nothing, fixes nothing. Exits 1 when findings exist.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { analyse, walk, type SourceFile } from "./jsx-source";
import {
  checkCombobox,
  checkHeadings,
  checkImages,
  checkInteractions,
  checkSvg,
  checkViewport,
  headingSources,
  type Finding,
} from "./checks";
import { AA_TEXT, auditContrast } from "./contrast";

const SOURCE_ROOTS = ["app", "components"] as const;

// ── run ──────────────────────────────────────────────────────────────

const json = Bun.argv.includes("--json");

const files = (
  await Promise.all(
    SOURCE_ROOTS.map(async (root) => {
      const dir = path.join(process.cwd(), root);
      const exists = await fs
        .access(dir)
        .then(() => true)
        .catch(() => false);
      return exists ? walk(dir) : [];
    }),
  )
)
  .flat()
  .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
  .sort();

const sources: SourceFile[] = await Promise.all(
  files.map(async (file) => {
    const raw = await fs.readFile(file, "utf-8");
    return analyse({ filePath: path.relative(process.cwd(), file), raw });
  }),
);

// A component's exported names, so a route's `<FamilyTreeViews />` can be
// resolved back to the headings that component actually renders.
const byComponent = new Map(
  sources.flatMap((file) =>
    [...file.source.matchAll(/export function ([A-Z][A-Za-z0-9_]*)/g)].map(
      (match) => [match[1], headingSources(file)] as const,
    ),
  ),
);

const routes = sources.filter((file) =>
  /^app\/.*(page|not-found)\.tsx$/.test(file.path),
);

const findings = [
  ...sources.flatMap(checkImages),
  ...sources.flatMap(checkSvg),
  ...sources.flatMap(checkInteractions),
  ...sources.flatMap(checkCombobox),
  ...sources.flatMap(checkViewport),
  ...checkHeadings({ routes, byComponent }),
].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const contrast = await auditContrast();
const contrastFailures = contrast.filter((row) => !row.passesText);

const byCode = findings.reduce<Map<string, Finding[]>>(
  (groups, finding) =>
    groups.set(finding.code, [...(groups.get(finding.code) ?? []), finding]),
  new Map(),
);

if (json) {
  console.log(
    JSON.stringify(
      {
        findings,
        counts: Object.fromEntries(
          [...byCode.entries()].map(([code, group]) => [code, group.length]),
        ),
        contrast,
        scanned: sources.length,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `A11Y AUDIT · ${sources.length} files · ${findings.length} findings\n`,
  );
  if (findings.length === 0) {
    console.log("  no findings");
  } else {
    [...byCode.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([code, group]) => {
        console.log(`${code.toUpperCase()} (${group.length})`);
        group.forEach((finding) => {
          console.log(`  ${finding.file}:${finding.line}  ${finding.element}`);
          console.log(`    ${finding.message}`);
        });
        console.log("");
      });
  }

  console.log(
    `CONTRAST · ${contrast.length} token pairs · ${contrastFailures.length} below AA text (${AA_TEXT}:1)`,
  );
  contrastFailures
    .sort((a, b) => a.ratio - b.ratio)
    .forEach((row) => {
      const verdict = row.passesLarge ? "large text only" : "fails all AA";
      console.log(
        `  ${row.ratio.toFixed(2)}:1  ${row.foreground} on ${row.background}  (${verdict})`,
      );
    });
  if (contrastFailures.length === 0) console.log("  all pairs pass");
}

process.exit(findings.length > 0 || contrastFailures.length > 0 ? 1 : 0);
