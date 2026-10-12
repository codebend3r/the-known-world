// Gale reads every argument as a glob, so a staged path under a `[slug]` route
// folder would match nothing and fail the commit. Escape the glob syntax first.
const escapeGlob = (file) => file.replace(/[[\]{}*?]/g, "\\$&");
const quote = (file) => `"${file}"`;

export default {
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["oxlint --fix", "oxfmt"],
  "*.{css,scss}": (files) => [
    `gale --fix ${files.map((file) => quote(escapeGlob(file))).join(" ")}`,
    `oxfmt ${files.map(quote).join(" ")}`,
  ],
  "*.{json,jsonc,json5,md,mdx,yml,yaml,toml,html}": "oxfmt",
};
