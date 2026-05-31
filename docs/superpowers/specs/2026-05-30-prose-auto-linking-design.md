# Prose auto-linking

## Goal

Turn mentions of other characters and houses inside a character or house page's prose body into hyperlinks, automatically, so a reader of `/characters/brandon-stark/` can click through to `/characters/rickard-stark/`, `/characters/catelyn-tully/`, `/houses/stark/`, etc. without authors hand-writing each link.

## Non-goals

- Linking castles, events, or any other entity. Out of scope for v1. Schema does not need to change for them.
- Editing existing prose bodies. The mechanism keys off frontmatter, not body rewrites.
- Client-side behavior. The build is a fully static export; this work runs entirely at render time.
- Backfilling `mentions` across every existing character and house in this change. The schema lands with a safe default of `[]`, and pages can be enriched incrementally.

## Design summary

Hybrid linker. A new remark plugin walks the markdown AST during `renderMarkdown` and rewrites matched name spans in prose into `link` nodes. Authors get short-form matching (first names, bare house names) only for slugs they list in a new `mentions` frontmatter field; everything else still auto-links when its full name appears verbatim.

## Decisions

| Decision            | Choice                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Link source         | Hybrid: auto-detect + per-page frontmatter overrides                                                           |
| Target entity kinds | Characters and Houses only (no Castles, no Events)                                                             |
| Short-form policy   | Per-page `mentions: [slug, ...]` unlocks first-name (character) and bare-name (house) matching for those slugs |
| Repeat policy       | First occurrence per slug per page only                                                                        |
| Self-link policy    | Page's own slug is never linked from its own body                                                              |
| Match casing        | Case-sensitive, word-boundary anchored                                                                         |
| Skip zones          | Inside existing `link` / `linkReference`, `code` / `inlineCode`, and `heading` nodes                           |
| Italics / emphasis  | Walked into; alias inside `*...*` still links                                                                  |

## Frontmatter / schema changes

`lib/schemas.ts`:

- `CharacterSchema` gains `mentions: z.array(z.string()).default([])`.
- `HouseSchema` gains `mentions: z.array(z.string()).default([])`.

Unknown slugs in `mentions` are silently ignored at render time (no schema-level cross-reference check; that would couple the schema to the loader). A separate content-validation script could add a warning later, but not in v1.

No new top-level field beyond `mentions`. A `mentions-skip` opt-out is explicitly deferred until a real false-positive shows up.

## Surface forms

Per active entity (an entity is "active" for the current page unless it equals the page's own slug), the linker emits these surface forms, ranked longest-first within the global regex:

**Character**

- `name` (e.g., `"Brandon Stark"`).
- Each entry in `aliases` (e.g., `"the Wild Wolf"`).
- The first whitespace-delimited token of `name` (e.g., `"Rickard"`) — **only if the character's slug is in the current page's `mentions`**.

**House**

- `name` (e.g., `"House Stark"`).
- The bare short form, computed as `name` with a leading `House ` stripped (e.g., `"Stark"`) — **only if the house's slug is in the current page's `mentions`**.

Surface forms shorter than 2 characters are dropped defensively.

## Matching algorithm

1. **Index build.** From `(allCharacters, allHouses, current.mentions, current.slug)`, produce a `ProseLinkIndex` containing every active target with its expanded surface forms and resolved `href`.
2. **Regex compilation.** Concatenate every surface form across every target into one alternation, sorted longest-first so `"Brandon Stark"` wins over `"Stark"`, escaped, and wrapped in `\b(...)\b`. Compiled once per render.
3. **Walk.** Visit every `text` node in the mdast tree (`unist-util-visit`). Skip a node entirely if any ancestor is `link`, `linkReference`, `code`, `inlineCode`, or `heading`.
4. **Scan + replace.** For each text node, run the regex left-to-right. For each hit:
   - Resolve the match back to its target.
   - If the target's slug equals the page's own slug → leave the span as text.
   - If the slug has already been linked once on this page → leave the span as text.
   - Otherwise, split the text node into `[textBefore, link, textAfter]` and mark the slug used. Continue scanning the trailing text.
5. The mutated mdast is then handed to `remark-html` as today.

Tracking "already linked" lives on the plugin instance (one render = one instance), keyed by slug.

## Plugin contract

```ts
// lib/prose-links.ts
import type { Plugin } from "unified";
import type { Character, House } from "./schemas";

export type ProseLinkTarget = {
  slug: string;
  kind: "character" | "house";
  href: string; // '/characters/<slug>/' | '/houses/<slug>/'
  surfaceForms: string[]; // already filtered by `mentions` rules, longest-first
};

export type ProseLinkIndex = {
  targets: ProseLinkTarget[];
  selfSlug: string | null;
};

export function buildProseLinkIndex(args: {
  allCharacters: ReadonlyArray<{ slug: string; frontmatter: Character }>;
  allHouses: ReadonlyArray<{ slug: string; frontmatter: House }>;
  current: {
    kind: "character" | "house";
    slug: string;
    mentions: readonly string[];
  };
}): ProseLinkIndex;

export function remarkProseLinks(index: ProseLinkIndex): Plugin;
```

`lib/content.ts`:

```ts
export async function renderMarkdown(
  source: string,
  opts?: { proseLinks?: ProseLinkIndex },
): Promise<string> {
  const pipeline = remark();
  if (opts?.proseLinks) pipeline.use(remarkProseLinks(opts.proseLinks));
  return (await pipeline.use(remarkHtml).process(source)).toString();
}
```

The optional argument keeps existing callers (`app/castles/[slug]/page.tsx`, tests) intact.

## Call sites

- `app/characters/[slug]/page.tsx` — already loads `allCharacters` and `allHouses`. Build the index with `current = { kind: 'character', slug, mentions: fm.mentions }` and pass it to `renderMarkdown`.
- `app/houses/[slug]/page.tsx` — already loads `allCharacters` and `allHouses`. Build with `kind: 'house'` and pass.
- `app/castles/[slug]/page.tsx` — no change; continues calling `renderMarkdown(castle.body)` without options.

The `Link` component is not used here because the linker emits raw HTML through `remark-html`. Hrefs are absolute paths with a trailing slash (`/characters/<slug>/`), matching the existing `Link href` patterns and the `trailingSlash: true` Next config so static export works.

## Authoring example

`content/characters/brandon-stark.md`:

```yaml
---
slug: brandon-stark
name: Brandon Stark
mentions:
  - rickard-stark
  - catelyn-tully
  - rhaegar-targaryen
  - lyanna-stark
  - aerys-ii-targaryen
# ...rest of frontmatter unchanged
---
Eldest son of Lord Rickard and heir to Winterfell, called *the Wild Wolf* for his hot blood and quick temper. Betrothed to Catelyn Tully of Riverrun, though they never wed. Rode south to King's Landing in 282 AC to demand satisfaction of Prince Rhaegar for the abduction of his sister Lyanna; was arrested for threatening a prince of the blood and put to death alongside his father by Aerys II.
```

After rendering, the following spans become links (first-occurrence only):

- `"Rickard"` → `/characters/rickard-stark/` (first-name match, gated by `mentions`)
- `"Catelyn Tully"` → `/characters/catelyn-tully/` (full-name match; `mentions` listing also OK)
- `"Rhaegar"` → `/characters/rhaegar-targaryen/` (first-name match, gated by `mentions`)
- `"Lyanna"` → `/characters/lyanna-stark/` (first-name match, gated by `mentions`)
- `"Aerys II"` → `/characters/aerys-ii-targaryen/` (alias match; `"Aerys II"` must be present in that character's `aliases` array, because the first-name token of `"Aerys II Targaryen"` is the ambiguous `"Aerys"`)

"Winterfell", "Riverrun", "King's Landing" are castles and stay as plain text (out of scope).

Practical note: characters who share a first name with anyone else in the corpus (Aegons, Aerys I/II/III, Brandons) need their disambiguating regnal or epithet form in `aliases` for short-form linking to work safely. The linker does not invent disambiguators on its own.

## Testing surface

Co-located vitest specs, all under the existing jsdom config:

`lib/prose-links.test.ts` — pure logic, hand-built fixtures, no disk reads. Covers:

- Full-name match in flat prose.
- Alias match inside `*emphasis*`.
- First-name match gated by `mentions` (in vs. out).
- House short form (`"Stark"`) gated by `mentions`.
- Longest-leftmost wins (`"Brandon Stark"` beats `"Stark"`).
- First-occurrence-only: second mention stays text.
- Self-link suppression for the page's own slug.
- Skip inside existing `[label](url)` link, `` `code` ``, and `# heading`.
- Possessive `"Stark's"` matches `"Stark"` and leaves `"'s"` trailing.
- Unknown slug in `mentions` is ignored.

`lib/content.test.ts` — extend the existing `renderMarkdown` test:

- Existing assertion (no index → no auto-links) stays as a regression guard.
- New assertion: pass a tiny `ProseLinkIndex`, expect output HTML to contain `<a href="/characters/...">...</a>` for the seeded match.

No component test changes. The character and house page components already drop HTML in via `dangerouslySetInnerHTML`; behavior is upstream in `renderMarkdown`.

## Risks + mitigations

- **Performance.** Index build runs per page render and walks every text node. Corpus is small (low hundreds of characters, dozens of houses). Single compiled regex per render keeps it well inside `bun run build` budget. Revisit only if the static build's render step becomes a bottleneck.
- **False positives from short forms.** Mitigated by requiring `mentions` opt-in for first-name and bare-house matches. A bare full-name collision (e.g., two characters literally sharing the same `name` field) would resolve to whichever target appears first in `allCharacters`; deferred until it happens.
- **Aliases with regex-special characters.** All surface forms are passed through a regex escape before alternation. Apostrophes and parentheses inside aliases stay intact.
- **Markdown surprises.** Tables, lists, blockquotes are walked normally; their text content is rewritten the same way as paragraph text. Headings are skipped.
- **Trailing-slash mismatch.** The plugin emits `/...slug/` with a trailing slash to match `trailingSlash: true`; otherwise Netlify would serve the 404 redirect on static export.
