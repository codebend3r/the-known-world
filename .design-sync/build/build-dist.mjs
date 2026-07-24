// TKW design-system dist builder.
//
// the-known-world is a Next.js app, not a component library with a shipped
// dist/. This script compiles the components/ source into a faithful,
// framework-free dist the design-sync converter can consume verbatim:
//
//   dist/tkw.js        one ESM module re-exporting every component, with
//                      react/react-dom/jsx-runtime EXTERNAL (the converter's
//                      IIFE pass maps them to window.React) and SCSS-modules
//                      compiled to scoped class-name strings.
//   dist/tkw.css       the compiled component module CSS (esbuild css output).
//   dist/ds-styles.css cssEntry: remote font @import + font-family vars +
//                      compiled styles/globals.scss tokens + component CSS.
//
// Faithfulness: every component is the repo's REAL code, compiled. The only
// substitutions are framework primitives the DS render environment can't
// provide — next/link -> <a>, next/image -> <img>, next/navigation + nuqs ->
// inert hooks. See .design-sync/NOTES.md for the re-sync risk register.
//
// Run: node .design-sync/build/build-dist.mjs   (from the repo root)
// Deps: esbuild (staged in .design-sync/build/node_modules), sass (repo).

import { build } from "esbuild";
import * as sass from "../../node_modules/sass/sass.node.mjs";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const STYLES = join(REPO, "styles");
const COMPONENTS = join(REPO, "components");
const DIST = join(HERE, "dist");

// Dirs whose index.ts exports only non-component helpers — excluded from the
// re-export entry. SectionGlyphs exports `sectionGlyph`/`sectionGlyphs`
// (lowercase data/helpers, not React components) and has no index.ts.
const EXCLUDE_DIRS = new Set(["SectionGlyphs"]);

// ── 1. synth entry: re-export every component dir's public index ────────────
const dirs = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !EXCLUDE_DIRS.has(e.name))
  .map((e) => e.name)
  .filter((name) => existsSync(join(COMPONENTS, name, "index.ts")))
  .sort();

const entryFile = join(HERE, ".entry.mjs");
writeFileSync(
  entryFile,
  dirs
    .map(
      (d) =>
        `export * from ${JSON.stringify(join(COMPONENTS, d, "index.ts"))};`,
    )
    .join("\n") + "\n",
);
console.error(`entry: re-exporting ${dirs.length} component dirs`);

// ── esbuild plugins ─────────────────────────────────────────────────────────
// @/* -> repo root (mirrors tsconfig paths).
const tsPaths = {
  name: "ts-paths",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => {
      const stem = join(REPO, a.path.slice(2));
      // Prefer explicit-extension and index resolution; only accept the bare
      // path when it's a FILE (a bare `@/components/Infobox` is a directory).
      for (const ext of [
        ".ts",
        ".tsx",
        ".scss",
        ".json",
        "/index.ts",
        "/index.tsx",
        "",
      ]) {
        const p = stem + ext;
        if (existsSync(p) && statSync(p).isFile()) return { path: p };
      }
      return undefined;
    });
  },
};

// Root-absolute url() refs in SCSS (`url(/patterns/x.avif)`) point at
// public/ assets. Resolve to public/ and inline (the DS render env has no
// public root); keep as-is (external) if the file isn't present.
const publicAssets = {
  name: "public-assets",
  setup(b) {
    b.onResolve({ filter: /^\// }, (a) => {
      if (a.kind !== "url-token") return null; // only CSS url() refs, never JS/entry
      const p = join(REPO, "public", a.path);
      return existsSync(p) && statSync(p).isFile()
        ? { path: p }
        : { path: a.path, external: true };
    });
  },
};

// *.module.scss -> sass compile -> esbuild local-css (scopes class names,
// collects the CSS into the js entry's sibling .css output). loadPaths=[styles]
// resolves the components' `@use "breakpoints"`.
const scssModules = {
  name: "scss-modules",
  setup(b) {
    b.onLoad({ filter: /\.module\.scss$/ }, (a) => {
      const r = sass.compile(a.path, {
        loadPaths: [STYLES],
        style: "expanded",
      });
      return {
        contents: r.css,
        loader: "local-css",
        resolveDir: dirname(a.path),
      };
    });
  },
};

// Framework primitives the DS render environment can't provide. Each stub is
// the smallest faithful shim: same public shape, plain-DOM behavior.
const NEXT_LINK = `import { createElement as h } from "react-compat";
export default function Link({ href, children, prefetch, replace, scroll, shallow, locale, ...rest }) {
  return h("a", { href: typeof href === "string" ? href : (href && href.pathname) || "#", ...rest }, children);
}`;
const NEXT_IMAGE = `import { createElement as h } from "react-compat";
export default function Image({ src, alt, fill, sizes, priority, loader, quality, placeholder, blurDataURL, unoptimized, ...rest }) {
  const s = typeof src === "string" ? src : (src && (src.src || src.default)) || "";
  const style = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(rest.style || {}) }
    : rest.style;
  return h("img", { ...rest, src: s, alt: alt || "", style });
}`;
const NEXT_NAV = `export function useRouter() { return { push(){}, replace(){}, back(){}, forward(){}, prefetch(){}, refresh(){} }; }
export function usePathname() { return "/"; }
export function useSearchParams() { return new URLSearchParams(); }
export function useParams() { return {}; }
export function useSelectedLayoutSegment() { return null; }
export function useSelectedLayoutSegments() { return []; }
export function redirect() {}
export function permanentRedirect() {}
export function notFound() {}`;
const NUQS = `function parser(d) { return { withDefault(v) { return { defaultValue: v }; }, withOptions() { return this; }, parse(x){return x}, serialize(x){return String(x)} }; }
export const parseAsString = parser();
export const parseAsInteger = parser();
export const parseAsFloat = parser();
export const parseAsBoolean = parser();
export const parseAsIsoDateTime = parser();
export const parseAsHex = parser();
export const parseAsTimestamp = parser();
export const parseAsJson = () => parser();
export function parseAsStringEnum() { return parser(); }
export function parseAsStringLiteral() { return parser(); }
export function parseAsNumberLiteral() { return parser(); }
export function parseAsArrayOf() { return parser(); }
export function createParser() { return parser(); }
export function useQueryState(_k, o) {
  const d = o && o.defaultValue !== undefined ? o.defaultValue : null;
  return [d, function () {}];
}
export function useQueryStates(defs) {
  const s = {};
  for (const k in (defs || {})) s[k] = defs[k] && defs[k].defaultValue !== undefined ? defs[k].defaultValue : null;
  return [s, function () {}];
}
export function NuqsAdapter({ children }) { return children; }`;
const REACT_COMPAT = `import * as R from "react"; export const createElement = R.createElement;`;

const stubs = {
  name: "framework-stubs",
  setup(b) {
    const map = {
      "next/link": ["next-link", NEXT_LINK],
      "next/image": ["next-image", NEXT_IMAGE],
      "next/navigation": ["next-nav", NEXT_NAV],
      nuqs: ["nuqs-stub", NUQS],
    };
    for (const spec of Object.keys(map)) {
      const esc = spec.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      b.onResolve({ filter: new RegExp(`^${esc}$`) }, () => ({
        path: map[spec][0],
        namespace: "stub",
      }));
    }
    const byPath = Object.fromEntries(
      Object.values(map).map(([p, src]) => [p, src]),
    );
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
      contents: byPath[a.path],
      loader: "js",
      resolveDir: REPO,
    }));
    // react-compat: createElement without pulling jsx-runtime into a stub module.
    b.onResolve({ filter: /^react-compat$/ }, () => ({
      path: "react-compat",
      namespace: "rc",
    }));
    b.onLoad({ filter: /.*/, namespace: "rc" }, () => ({
      contents: REACT_COMPAT,
      loader: "js",
      resolveDir: REPO,
    }));
  },
};

// ── 2. bundle ───────────────────────────────────────────────────────────────
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const result = await build({
  entryPoints: [entryFile],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  outfile: join(DIST, "tkw.js"),
  jsx: "automatic",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ],
  plugins: [tsPaths, publicAssets, scssModules, stubs],
  loader: {
    ".svg": "dataurl",
    ".png": "dataurl",
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".avif": "dataurl",
    ".webp": "dataurl",
    ".woff2": "dataurl",
    ".woff": "dataurl",
  },
  metafile: true,
  logLevel: "warning",
  define: { "process.env.NODE_ENV": '"production"' },
});

const outputs = Object.keys(result.metafile.outputs);
const jsPath = join(DIST, "tkw.js");
const cssPath = join(DIST, "tkw.css");
if (!existsSync(jsPath)) {
  console.error("FATAL: tkw.js not emitted");
  process.exit(1);
}
const componentCss = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";

// ── 3. tokens (compiled styles/globals.scss) ────────────────────────────────
const tokensCss = sass.compile(join(STYLES, "globals.scss"), {
  loadPaths: [STYLES],
  style: "expanded",
}).css;

// ── 4. fonts: define the family vars next/font sets at runtime, load them
//      from the public font host. Remote @import must be the FIRST rule in the
//      stylesheet (CSS spec) — ds-styles.css leads with it.
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Cinzel:wght@400;500;600;700&family=Cormorant+Unicase:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');";
const FONT_VARS = `:root {
  --font-cinzel: 'Cinzel';
  --font-cormorant-unicase: 'Cormorant Unicase';
  --font-eb-garamond: 'EB Garamond';
  --font-alegreya-sans: 'Alegreya Sans';
}`;

// ── 5. combined cssEntry ─────────────────────────────────────────────────────
const dsStyles = [
  FONT_IMPORT,
  "/* --- font family vars (next/font substitutes) --- */",
  FONT_VARS,
  "/* --- design tokens + type primitives (styles/globals.scss) --- */",
  tokensCss,
  "/* --- component module styles --- */",
  componentCss,
].join("\n\n");
writeFileSync(join(DIST, "ds-styles.css"), dsStyles + "\n");

writeFileSync(
  join(DIST, ".meta.json"),
  JSON.stringify(
    {
      builtDirs: dirs,
      outputs,
      jsBytes: readFileSync(jsPath).length,
      cssBytes: Buffer.byteLength(dsStyles),
    },
    null,
    2,
  ) + "\n",
);

console.error(`dist ready:`);
console.error(
  `  tkw.js        ${(readFileSync(jsPath).length / 1024).toFixed(0)} KB`,
);
console.error(
  `  ds-styles.css ${(Buffer.byteLength(dsStyles) / 1024).toFixed(0)} KB (fonts + tokens + ${(componentCss.length / 1024).toFixed(0)}KB components)`,
);
