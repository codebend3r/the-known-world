# Foundation & First Castle Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project, the parchment design system, the Markdown content pipeline, and a single working castle page (Winterfell) end-to-end as a deployed static site.

**Architecture:** Next.js (app router) with `output: 'export'` for static deployment to Netlify. Markdown frontmatter validated by zod at build time. Content loader (`gray-matter` + `remark`) parses all `.md` files in `content/`. Relation graph built once at build time, made available to pages via a small content module. No runtime backend.

**Tech Stack:** Next.js 15, TypeScript, React 19, `gray-matter`, `remark`, `remark-html`, `zod`, `vitest`, `next/font`, EB Garamond + Cinzel + Inter (Google Fonts). Package manager: bun. Deploy: Netlify.

**Out of scope for this plan:** the map view, the timeline view, the houses grid, the family tree view, the scraping CLI, the PWA / service worker, OG image generation. Those each get their own plan after this lands.

---

## Pre-flight

The repo `game-of-thrones-atlas` is already cloned at `/Users/snowball/Developer/git/game-of-thrones-atlas`. It currently contains only `.gitignore` and `docs/`. All paths below are relative to that directory.

Tooling expected on the machine: `node` (≥ 20), `bun` (≥ 1.3), `git`. If `bun` is missing: `brew install bun` (or `curl -fsSL https://bun.sh/install | bash`).

---

## File Structure (this plan)

Files created:

```
package.json                              # bun manifest
bun.lock                                  # lockfile
tsconfig.json                             # TS config
next.config.mjs                           # Next.js config (static export)
netlify.toml                              # Netlify build config
vitest.config.ts                          # Vitest config
.eslintrc.json                            # ESLint
postcss.config.mjs                        # for global CSS only (no Tailwind)
app/layout.tsx                            # root layout (loads fonts, ParchmentLayout)
app/page.tsx                              # homepage
app/castles/[slug]/page.tsx               # castle detail page
app/not-found.tsx                         # 404
components/ParchmentLayout.tsx            # site shell
components/DropCap.tsx                    # first-paragraph drop cap
components/Sources.tsx                    # attribution footer
lib/schemas.ts                            # zod schemas for all entity types
lib/content.ts                            # Markdown loader (gray-matter + remark)
lib/relations.ts                          # relation graph builder
lib/schemas.test.ts                       # zod schema tests
lib/content.test.ts                       # content loader tests
lib/relations.test.ts                     # relation graph tests
styles/globals.css                        # CSS reset + tokens + base type
styles/parchment.css                      # parchment textures + utility classes
content/castles/winterfell.md             # sample castle (hand-written)
content/houses/stark.md                   # stub house (for relation testing)
public/favicon.ico                        # placeholder
```

Files modified after creation: none. Every file is touched exactly once in this plan.

---

## Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `bun.lock`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `.eslintrc.json`, `postcss.config.mjs`, `public/favicon.ico`

- [ ] **Step 1: Run the Next.js initializer in the current directory**

```bash
bun create next-app@latest . \
  --typescript \
  --eslint \
  --app \
  --no-tailwind \
  --no-src-dir \
  --import-alias '@/*'
```

When it asks "directory not empty, continue?" answer **Yes** (the existing `.gitignore` and `docs/` are preserved). If the wizard prompts for a package manager, choose **bun**.

Expected: a working Next.js scaffold. The dev server starts cleanly with `bun dev`.

- [ ] **Step 2: Verify it boots**

```bash
bun dev
```

Open `http://localhost:3000` and confirm the default Next.js welcome page renders. Then `Ctrl-C` to stop the server.

- [ ] **Step 3: Replace `next.config.mjs` for static export**

Overwrite `next.config.mjs` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 4: Verify the static build runs**

```bash
bun run build
```

Expected: build succeeds; `out/` directory created with HTML, JS, CSS. Sanity-check with `ls out/` (should contain `index.html`, `_next/`, etc.).

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock tsconfig.json next.config.mjs \
        .eslintrc.json postcss.config.mjs app/ public/
git commit -m "chore: scaffold Next.js app with static export"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json` (via bun)

- [ ] **Step 1: Install content/parsing libraries**

```bash
bun add gray-matter remark remark-html zod
```

- [ ] **Step 2: Install dev dependencies (testing)**

```bash
bun add -d vitest @vitest/ui
```

- [ ] **Step 3: Verify they're in `package.json`**

```bash
cat package.json | grep -E '"(gray-matter|remark|remark-html|zod|vitest)"'
```

Expected: all five entries present.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add content parsing and test dependencies"
```

---

## Task 3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: Add scripts to `package.json`**

Edit `package.json` so the `"scripts"` block includes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Verify Vitest can discover (zero tests is fine)**

```bash
bun run test
```

Expected: "No test files found". This is the expected pass before we write any tests.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: configure vitest"
```

---

## Task 4: Frontmatter schemas with TDD

**Files:**
- Create: `lib/schemas.ts`, `lib/schemas.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Create `lib/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  CastleSchema,
  HouseSchema,
  PersonSchema,
  EventSchema,
} from './schemas';

describe('CastleSchema', () => {
  it('parses a complete valid castle', () => {
    const input = {
      slug: 'winterfell',
      name: 'Winterfell',
      type: 'castle',
      'sub-region': 'northern-mountains',
      'liege-house': 'stark',
      founded: { year: -8000, era: 'age-of-heroes', precision: 'legendary' },
      'sworn-houses': ['karstark', 'umber'],
      features: ['godswood'],
      coords: { x: 412, y: 280 },
      sources: [{ type: 'awoiaf', url: 'https://example', license: 'CC-BY-SA-4.0' }],
      draft: false,
    };
    expect(() => CastleSchema.parse(input)).not.toThrow();
  });

  it('rejects an invalid type', () => {
    const input = { slug: 'x', name: 'X', type: 'spaceport', coords: { x: 0, y: 0 }, sources: [], draft: false };
    expect(() => CastleSchema.parse(input)).toThrow();
  });

  it('defaults draft to false when omitted', () => {
    const input = {
      slug: 'x', name: 'X', type: 'castle',
      coords: { x: 0, y: 0 }, sources: [],
    };
    const parsed = CastleSchema.parse(input);
    expect(parsed.draft).toBe(false);
  });
});

describe('HouseSchema', () => {
  it('parses a Great House (null liege)', () => {
    const input = {
      slug: 'stark',
      name: 'House Stark',
      seat: 'winterfell',
      liege: null,
      words: 'Winter is Coming',
      sigil: { description: 'A grey direwolf on a white field' },
      founded: { year: -8000, era: 'age-of-heroes', precision: 'legendary' },
      status: 'extant',
      'sworn-from': ['karstark'],
      'cadet-houses': ['greystark'],
      sources: [],
      draft: false,
    };
    expect(() => HouseSchema.parse(input)).not.toThrow();
  });

  it('rejects unknown status', () => {
    const input = {
      slug: 'x', name: 'X', seat: 'y', liege: null,
      words: '', sigil: { description: '' },
      founded: { year: 0, era: 'AC', precision: 'year' },
      status: 'partying', 'sworn-from': [], 'cadet-houses': [], sources: [],
    };
    expect(() => HouseSchema.parse(input)).toThrow();
  });
});

describe('PersonSchema', () => {
  it('parses a named person', () => {
    const input = {
      slug: 'eddard-stark',
      name: 'Eddard Stark',
      born: { year: 263, era: 'AC', precision: 'year' },
      died: { year: 299, era: 'AC', precision: 'year' },
      'primary-house': 'stark',
      'also-of-houses': [],
      parents: ['rickard-stark', 'lyarra-stark'],
      spouses: ['catelyn-tully'],
      children: ['robb-stark'],
      titles: ['Lord of Winterfell'],
      placeholder: false,
      'placeholder-reason': null,
      sources: [],
      draft: false,
    };
    expect(() => PersonSchema.parse(input)).not.toThrow();
  });

  it('allows a placeholder person with null name dates', () => {
    const input = {
      slug: 'unnamed-stark-daughter',
      name: 'Unnamed Stark daughter',
      born: null,
      died: null,
      'primary-house': 'stark',
      'also-of-houses': [],
      parents: ['cregan-stark'],
      spouses: [],
      children: [],
      titles: [],
      placeholder: true,
      'placeholder-reason': 'unnamed',
      sources: [],
      draft: false,
    };
    expect(() => PersonSchema.parse(input)).not.toThrow();
  });
});

describe('EventSchema', () => {
  it('parses a battle with both sides', () => {
    const input = {
      slug: 'red-wedding',
      name: 'The Red Wedding',
      type: 'betrayal',
      date: { year: 299, era: 'AC', precision: 'year' },
      location: 'the-twins',
      participants: [
        { side: 'stark', houses: ['stark', 'tully'] },
        { side: 'frey', houses: ['frey', 'bolton'] },
      ],
      outcome: 'stark-defeat',
      casualties: ['robb-stark'],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });

  it('allows location as coords for field battles', () => {
    const input = {
      slug: 'whispering-wood',
      name: 'Battle of the Whispering Wood',
      type: 'battle',
      date: { year: 298, era: 'AC', precision: 'year' },
      location: { x: 300, y: 400 },
      participants: [],
      outcome: 'stark-victory',
      casualties: [],
      sources: [],
      draft: false,
    };
    expect(() => EventSchema.parse(input)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests, expect failure**

```bash
bun run test
```

Expected: all tests fail with "Cannot find module './schemas'" or similar.

- [ ] **Step 3: Implement the schemas**

Create `lib/schemas.ts`:

```typescript
import { z } from 'zod';

const EraSchema = z.enum(['dawn-age', 'age-of-heroes', 'long-night', 'andal-invasion', 'targaryen-conquest', 'roberts-reign', 'game-of-thrones', 'AC', 'BC']);

const PrecisionSchema = z.enum(['exact', 'year', 'decade', 'era', 'legendary']);

const DateSchema = z.object({
  year: z.number().int(),
  era: EraSchema,
  precision: PrecisionSchema,
});

const SourceSchema = z.object({
  type: z.enum(['awoiaf', 'book', 'show', 'other']),
  url: z.string().url().optional(),
  ref: z.string().optional(),
  license: z.string().optional(),
});

const CoordsSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CastleSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['castle', 'town', 'ruin', 'watchtower', 'holdfast']),
  'sub-region': z.string().optional(),
  'liege-house': z.string().optional(),
  founded: DateSchema.optional(),
  'sworn-houses': z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  coords: CoordsSchema,
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export const HouseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  seat: z.string(),
  liege: z.string().nullable(),
  words: z.string(),
  sigil: z.object({ description: z.string() }),
  founded: DateSchema,
  status: z.enum(['extant', 'extinct', 'exiled', 'hidden']),
  'sworn-from': z.array(z.string()).default([]),
  'cadet-houses': z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export const PersonSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  born: DateSchema.nullable(),
  died: DateSchema.nullable(),
  'primary-house': z.string(),
  'also-of-houses': z.array(z.string()).default([]),
  parents: z.array(z.string()).default([]),
  spouses: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  placeholder: z.boolean().default(false),
  'placeholder-reason': z.enum(['unnamed', 'unwritten', 'uncertain']).nullable().default(null),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const ParticipantSchema = z.object({
  side: z.string(),
  houses: z.array(z.string()).default([]),
});

export const EventSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['battle', 'siege', 'treaty', 'wedding', 'death', 'betrayal', 'other']),
  date: DateSchema,
  location: z.union([z.string(), CoordsSchema]),
  participants: z.array(ParticipantSchema).default([]),
  outcome: z.string().optional(),
  casualties: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

export type Castle = z.infer<typeof CastleSchema>;
export type House = z.infer<typeof HouseSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Event = z.infer<typeof EventSchema>;
```

- [ ] **Step 4: Run the tests, expect pass**

```bash
bun run test
```

Expected: all schema tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas.ts lib/schemas.test.ts
git commit -m "feat: zod schemas for castles, houses, people, events"
```

---

## Task 5: Content loader with TDD

**Files:**
- Create: `lib/content.ts`, `lib/content.test.ts`
- Create: `content/castles/_sample-for-test.md` (fixture, temporary)

- [ ] **Step 1: Create a fixture content file for the test**

Create `content/castles/_sample-for-test.md`:

```markdown
---
slug: sample-castle
name: Sample Castle
type: castle
coords: { x: 100, y: 200 }
sources: []
draft: false
---

# Sample Castle

This is the **body** of the castle entry. It supports normal Markdown.
```

- [ ] **Step 2: Write the failing tests**

Create `lib/content.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loadCastle, loadAllCastles, renderMarkdown } from './content';

describe('loadCastle', () => {
  it('loads the sample castle fixture', async () => {
    const result = await loadCastle('_sample-for-test');
    expect(result.frontmatter.slug).toBe('sample-castle');
    expect(result.frontmatter.name).toBe('Sample Castle');
    expect(result.body).toContain('Sample Castle');
    expect(result.body).toContain('**body**');
  });

  it('throws on missing castle', async () => {
    await expect(loadCastle('does-not-exist')).rejects.toThrow();
  });
});

describe('loadAllCastles', () => {
  it('returns at least the sample fixture', async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain('sample-castle');
  });
});

describe('renderMarkdown', () => {
  it('converts Markdown body to HTML', async () => {
    const html = await renderMarkdown('# Hello\n\nA **bold** word.');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
```

- [ ] **Step 3: Run, expect failure**

```bash
bun run test
```

Expected: content tests fail with "Cannot find module './content'".

- [ ] **Step 4: Implement the loader**

Create `lib/content.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import { CastleSchema, HouseSchema, PersonSchema, EventSchema, type Castle, type House, type Person, type Event } from './schemas';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<T>(
  type: 'castles' | 'houses' | 'people' | 'events',
  slug: string,
  schema: { parse: (input: unknown) => T },
): Promise<Loaded<T>> {
  const filePath = path.join(CONTENT_ROOT, type, `${slug}.md`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = matter(raw);
  const frontmatter = schema.parse(parsed.data);
  return { frontmatter, body: parsed.content, slug };
}

async function loadAll<T>(
  type: 'castles' | 'houses' | 'people' | 'events',
  schema: { parse: (input: unknown) => T },
): Promise<Array<Loaded<T>>> {
  const dir = path.join(CONTENT_ROOT, type);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const mdFiles = files.filter((f) => f.endsWith('.md'));
  return Promise.all(
    mdFiles.map((f) => loadFile<T>(type, f.replace(/\.md$/, ''), schema)),
  );
}

export const loadCastle = (slug: string) => loadFile<Castle>('castles', slug, CastleSchema);
export const loadHouse = (slug: string) => loadFile<House>('houses', slug, HouseSchema);
export const loadPerson = (slug: string) => loadFile<Person>('people', slug, PersonSchema);
export const loadEvent = (slug: string) => loadFile<Event>('events', slug, EventSchema);

export const loadAllCastles = () => loadAll<Castle>('castles', CastleSchema);
export const loadAllHouses = () => loadAll<House>('houses', HouseSchema);
export const loadAllPeople = () => loadAll<Person>('people', PersonSchema);
export const loadAllEvents = () => loadAll<Event>('events', EventSchema);

export async function renderMarkdown(source: string): Promise<string> {
  const processed = await remark().use(remarkHtml).process(source);
  return processed.toString();
}
```

- [ ] **Step 5: Run, expect pass**

```bash
bun run test
```

Expected: all schema and content tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/content.ts lib/content.test.ts content/castles/_sample-for-test.md
git commit -m "feat: Markdown content loader with frontmatter validation"
```

---

## Task 6: Relation graph with TDD

**Files:**
- Create: `lib/relations.ts`, `lib/relations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/relations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildRelationGraph, findOrphanSlugs } from './relations';

describe('buildRelationGraph', () => {
  it('builds a graph from castles and houses', () => {
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': ['karstark'], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': ['karstark'], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const graph = buildRelationGraph({ castles, houses: houses as never, people: [], events: [] });
    expect(graph.castleByHouse.get('stark')).toEqual(['winterfell']);
    expect(graph.houseBySeat.get('winterfell')).toBe('stark');
  });
});

describe('findOrphanSlugs', () => {
  it('returns slugs referenced but not defined', () => {
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': ['ghostvale'], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const orphans = findOrphanSlugs({ castles, houses: houses as never, people: [], events: [] });
    expect(orphans).toContain('ghostvale');
  });

  it('returns empty when all references resolve', () => {
    const houses = [
      { frontmatter: { slug: 'stark', seat: 'winterfell', liege: null, name: 'House Stark', words: '', sigil: { description: '' }, founded: { year: 0, era: 'AC', precision: 'year' }, status: 'extant', 'sworn-from': [], 'cadet-houses': [], sources: [], draft: false }, body: '', slug: 'stark' },
    ];
    const castles = [
      { frontmatter: { slug: 'winterfell', 'liege-house': 'stark', 'sworn-houses': [], type: 'castle', name: 'Winterfell', coords: { x: 0, y: 0 }, sources: [], draft: false }, body: '', slug: 'winterfell' },
    ];
    const orphans = findOrphanSlugs({ castles, houses: houses as never, people: [], events: [] });
    expect(orphans).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
bun run test
```

- [ ] **Step 3: Implement the graph builder**

Create `lib/relations.ts`:

```typescript
import type { Castle, House, Person, Event } from './schemas';

type Loaded<T> = { frontmatter: T; body: string; slug: string };

export interface ContentSet {
  castles: Array<Loaded<Castle>>;
  houses: Array<Loaded<House>>;
  people: Array<Loaded<Person>>;
  events: Array<Loaded<Event>>;
}

export interface RelationGraph {
  castleByHouse: Map<string, string[]>;     // house slug → castle slugs whose liege-house is this house
  houseBySeat: Map<string, string>;         // castle slug → house slug whose seat is this castle
  membersByHouse: Map<string, string[]>;    // house slug → person slugs whose primary-house is this house
  eventsByLocation: Map<string, string[]>;  // castle slug → event slugs located there
}

export function buildRelationGraph(set: ContentSet): RelationGraph {
  const castleByHouse = new Map<string, string[]>();
  const houseBySeat = new Map<string, string>();
  const membersByHouse = new Map<string, string[]>();
  const eventsByLocation = new Map<string, string[]>();

  for (const castle of set.castles) {
    const houseSlug = castle.frontmatter['liege-house'];
    if (houseSlug) {
      const existing = castleByHouse.get(houseSlug) ?? [];
      existing.push(castle.frontmatter.slug);
      castleByHouse.set(houseSlug, existing);
    }
  }

  for (const house of set.houses) {
    houseBySeat.set(house.frontmatter.seat, house.frontmatter.slug);
  }

  for (const person of set.people) {
    const houseSlug = person.frontmatter['primary-house'];
    const existing = membersByHouse.get(houseSlug) ?? [];
    existing.push(person.frontmatter.slug);
    membersByHouse.set(houseSlug, existing);
  }

  for (const event of set.events) {
    const loc = event.frontmatter.location;
    if (typeof loc === 'string') {
      const existing = eventsByLocation.get(loc) ?? [];
      existing.push(event.frontmatter.slug);
      eventsByLocation.set(loc, existing);
    }
  }

  return { castleByHouse, houseBySeat, membersByHouse, eventsByLocation };
}

export function findOrphanSlugs(set: ContentSet): string[] {
  const allSlugs = new Set<string>([
    ...set.castles.map((c) => c.frontmatter.slug),
    ...set.houses.map((h) => h.frontmatter.slug),
    ...set.people.map((p) => p.frontmatter.slug),
    ...set.events.map((e) => e.frontmatter.slug),
  ]);

  const referenced = new Set<string>();

  for (const castle of set.castles) {
    if (castle.frontmatter['liege-house']) referenced.add(castle.frontmatter['liege-house']);
    for (const s of castle.frontmatter['sworn-houses']) referenced.add(s);
  }
  for (const house of set.houses) {
    referenced.add(house.frontmatter.seat);
    if (house.frontmatter.liege) referenced.add(house.frontmatter.liege);
    for (const s of house.frontmatter['sworn-from']) referenced.add(s);
    for (const s of house.frontmatter['cadet-houses']) referenced.add(s);
  }
  for (const person of set.people) {
    referenced.add(person.frontmatter['primary-house']);
    for (const s of person.frontmatter.parents) referenced.add(s);
    for (const s of person.frontmatter.spouses) referenced.add(s);
    for (const s of person.frontmatter.children) referenced.add(s);
  }
  for (const event of set.events) {
    if (typeof event.frontmatter.location === 'string') referenced.add(event.frontmatter.location);
    for (const p of event.frontmatter.participants) {
      for (const h of p.houses) referenced.add(h);
    }
    for (const s of event.frontmatter.casualties) referenced.add(s);
  }

  const orphans: string[] = [];
  for (const slug of referenced) {
    if (!allSlugs.has(slug)) orphans.push(slug);
  }
  return orphans;
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test
```

- [ ] **Step 5: Commit**

```bash
git add lib/relations.ts lib/relations.test.ts
git commit -m "feat: relation graph builder + orphan slug detection"
```

---

## Task 7: Hand-written sample content

**Files:**
- Create: `content/castles/winterfell.md`, `content/houses/stark.md`
- Delete: `content/castles/_sample-for-test.md` (replaced by Winterfell)

- [ ] **Step 1: Write the Winterfell castle entry**

Replace `content/castles/_sample-for-test.md` with a new file `content/castles/winterfell.md`:

```markdown
---
slug: winterfell
name: Winterfell
type: castle
sub-region: northern-mountains
liege-house: stark
founded:
  year: -8000
  era: age-of-heroes
  precision: legendary
sworn-houses: []
features:
  - godswood
  - hot-springs
  - broken-tower
  - glass-gardens
  - crypt
coords:
  x: 412
  y: 280
sources: []
draft: false
---

Ancient seat of the Kings of Winter, said to have stood for eight thousand years upon the bones of the First Men. Its godswood is older than the realm itself.

## The Godswood

At the heart of Winterfell lies a godswood three acres across, never touched by axe since the day the First Men raised its walls. A heart tree of weirwood stands at its center, its face carved by hands now forgotten.

## The Crypts

Beneath the castle, in caverns far older than the walls above, the Lords of Winterfell are laid to rest. Each in their stone seat, with their direwolf at their feet and a sword across their lap.
```

- [ ] **Step 2: Write the Stark house stub**

Create `content/houses/stark.md`:

```markdown
---
slug: stark
name: House Stark
seat: winterfell
liege: null
words: "Winter is Coming"
sigil:
  description: A grey direwolf running on a white field
founded:
  year: -8000
  era: age-of-heroes
  precision: legendary
status: extant
sworn-from: []
cadet-houses: []
sources: []
draft: false
---

House Stark of Winterfell is one of the Great Houses of Westeros and the principal noble house of the North. They ruled as Kings in the North for eight thousand years before bending the knee to Aegon the Conqueror.
```

- [ ] **Step 3: Remove the sample fixture and update the test to point at Winterfell**

Delete the fixture and update `lib/content.test.ts` so the loader test uses the real Winterfell file:

```bash
rm content/castles/_sample-for-test.md
```

Edit `lib/content.test.ts`. Replace every `'sample-castle'` slug expectation and `'_sample-for-test'` path with `'winterfell'` and `'Winterfell'`. Replace the body assertions with assertions that match Winterfell's content (e.g., `expect(result.body).toContain('Ancient seat')`). The full updated test file:

```typescript
import { describe, it, expect } from 'vitest';
import { loadCastle, loadAllCastles, renderMarkdown } from './content';

describe('loadCastle', () => {
  it('loads Winterfell', async () => {
    const result = await loadCastle('winterfell');
    expect(result.frontmatter.slug).toBe('winterfell');
    expect(result.frontmatter.name).toBe('Winterfell');
    expect(result.body).toContain('Ancient seat');
  });

  it('throws on missing castle', async () => {
    await expect(loadCastle('does-not-exist')).rejects.toThrow();
  });
});

describe('loadAllCastles', () => {
  it('returns Winterfell', async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain('winterfell');
  });
});

describe('renderMarkdown', () => {
  it('converts Markdown body to HTML', async () => {
    const html = await renderMarkdown('# Hello\n\nA **bold** word.');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test
```

- [ ] **Step 5: Commit**

```bash
git add content/ lib/content.test.ts
git commit -m "content: add Winterfell castle and Stark house entries"
```

---

## Task 8: Design tokens and parchment stylesheet

**Files:**
- Create: `styles/globals.css`, `styles/parchment.css`
- Modify: `app/layout.tsx` (to import the styles + load fonts)

- [ ] **Step 1: Create `styles/globals.css`**

```css
:root {
  --parchment-light: #f4e4c1;
  --parchment-dark: #e8d3a0;
  --vellum: #f8ecd0;
  --ink: #3d2817;
  --ink-faded: #6b4423;
  --wax-seal: #8b1a1a;
  --gold-leaf: #d4a259;

  --font-heading: var(--font-cinzel), Georgia, serif;
  --font-body: var(--font-eb-garamond), Georgia, serif;
  --font-ui: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background:
    radial-gradient(ellipse at top left, rgba(180, 140, 90, 0.15), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(120, 80, 40, 0.18), transparent 60%),
    linear-gradient(180deg, var(--parchment-light) 0%, var(--parchment-dark) 100%);
  background-attachment: fixed;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 18px;
  line-height: 1.65;
  min-height: 100vh;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 1px;
}

h1 { font-size: 2.2rem; font-variant: small-caps; letter-spacing: 2px; text-align: center; }
h2 { font-size: 1.4rem; border-bottom: 1px solid rgba(107, 68, 35, 0.3); padding-bottom: 0.3rem; }
h3 { font-size: 1.15rem; color: var(--ink-faded); }

a { color: var(--ink-faded); text-decoration: underline; text-decoration-color: rgba(107, 68, 35, 0.4); }
a:hover { color: var(--gold-leaf); }
```

- [ ] **Step 2: Create `styles/parchment.css`**

```css
.parchment-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 2rem 6rem;
  position: relative;
}

.parchment-page::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 18% 22%, rgba(80, 50, 20, 0.06) 1px, transparent 2px),
    radial-gradient(circle at 74% 58%, rgba(80, 50, 20, 0.05) 1px, transparent 2px),
    radial-gradient(circle at 42% 80%, rgba(80, 50, 20, 0.06) 1px, transparent 2px);
  background-size: 90px 90px, 110px 110px, 130px 130px;
  z-index: 0;
}

.parchment-page > * { position: relative; z-index: 1; }

.subtitle {
  text-align: center;
  font-style: italic;
  color: var(--ink-faded);
  margin-top: -0.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(107, 68, 35, 0.3);
}

.drop-cap::first-letter {
  font-family: var(--font-heading);
  font-size: 3.2rem;
  float: left;
  line-height: 1;
  padding: 0.15rem 0.5rem 0 0;
  color: var(--ink-faded);
  font-weight: 600;
}

.sources {
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(107, 68, 35, 0.3);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  color: var(--ink-faded);
}
```

- [ ] **Step 3: Update `app/layout.tsx` to load fonts and styles**

Replace `app/layout.tsx` entirely:

```tsx
import type { Metadata } from 'next';
import { Cinzel, EB_Garamond, Inter } from 'next/font/google';
import '../styles/globals.css';
import '../styles/parchment.css';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '600', '700'] });
const ebGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-eb-garamond', weight: ['400', '500', '600'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Atlas of the North · A Song of Ice and Fire',
  description: 'An interactive atlas of the North in George R. R. Martin\'s world of Ice and Fire.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${ebGaramond.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the dev server renders styled text**

```bash
bun dev
```

Open `http://localhost:3000`. You should see the default Next.js home content rendered on a parchment background with serif fonts. (The page content is still placeholder, which is expected.) `Ctrl-C` when done.

- [ ] **Step 5: Commit**

```bash
git add styles/ app/layout.tsx
git commit -m "feat: parchment design tokens, fonts, base typography"
```

---

## Task 9: ParchmentLayout, DropCap, and Sources components

**Files:**
- Create: `components/ParchmentLayout.tsx`, `components/DropCap.tsx`, `components/Sources.tsx`

- [ ] **Step 1: Create `components/ParchmentLayout.tsx`**

```tsx
import type { ReactNode } from 'react';

export function ParchmentLayout({ children }: { children: ReactNode }) {
  return <main className="parchment-page">{children}</main>;
}
```

- [ ] **Step 2: Create `components/DropCap.tsx`**

```tsx
import type { ReactNode } from 'react';

export function DropCap({ children }: { children: ReactNode }) {
  return <p className="drop-cap">{children}</p>;
}
```

- [ ] **Step 3: Create `components/Sources.tsx`**

```tsx
import type { Source } from '@/lib/schemas';

type Props = { sources: Source[] };

export function Sources({ sources }: Props) {
  if (sources.length === 0) return null;
  return (
    <footer className="sources">
      <strong>Sources:</strong>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            {s.type === 'awoiaf' && s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                A Wiki of Ice and Fire ({s.license ?? 'CC-BY-SA-4.0'})
              </a>
            ) : (
              <span>{s.ref ?? s.url ?? s.type}</span>
            )}
          </li>
        ))}
      </ul>
    </footer>
  );
}
```

- [ ] **Step 4: Export `Source` type from `lib/schemas.ts`**

Add to the end of `lib/schemas.ts`:

```typescript
export type Source = z.infer<typeof SourceSchema>;
```

(`SourceSchema` is defined privately in the file; this line surfaces just the type. If the schema itself was named differently, match it.)

- [ ] **Step 5: Run `bun run build` to verify the project still compiles**

```bash
bun run build
```

Expected: build passes (the new components aren't used by any page yet, but their imports must resolve).

- [ ] **Step 6: Commit**

```bash
git add components/ lib/schemas.ts
git commit -m "feat: ParchmentLayout, DropCap, Sources components"
```

---

## Task 10: Castle detail page

**Files:**
- Create: `app/castles/[slug]/page.tsx`

- [ ] **Step 1: Create the dynamic route**

Create `app/castles/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { loadCastle, loadAllCastles, renderMarkdown } from '@/lib/content';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { Sources } from '@/components/Sources';

export async function generateStaticParams() {
  const castles = await loadAllCastles();
  return castles
    .filter((c) => !c.frontmatter.draft)
    .map((c) => ({ slug: c.frontmatter.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const castle = await loadCastle(slug);
    return {
      title: `${castle.frontmatter.name} · Atlas of the North`,
      description: `${castle.frontmatter.name}, ${castle.frontmatter.type} in the North.`,
    };
  } catch {
    return { title: 'Not found' };
  }
}

export default async function CastlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let castle;
  try {
    castle = await loadCastle(slug);
  } catch {
    notFound();
  }

  const html = await renderMarkdown(castle.body);

  return (
    <ParchmentLayout>
      <h1>{castle.frontmatter.name}</h1>
      <p className="subtitle">
        {castle.frontmatter.type === 'castle' ? 'Castle' : castle.frontmatter.type}
        {castle.frontmatter['liege-house'] && (
          <> &middot; Seat of House {castle.frontmatter['liege-house']}</>
        )}
      </p>
      <article dangerouslySetInnerHTML={{ __html: html }} />
      <Sources sources={castle.frontmatter.sources} />
    </ParchmentLayout>
  );
}
```

- [ ] **Step 2: Create the not-found page**

Create `app/not-found.tsx`:

```tsx
import { ParchmentLayout } from '@/components/ParchmentLayout';

export default function NotFound() {
  return (
    <ParchmentLayout>
      <h1>Not found</h1>
      <p className="subtitle">No such place in the chronicles.</p>
    </ParchmentLayout>
  );
}
```

- [ ] **Step 3: Verify in dev mode**

```bash
bun dev
```

Open `http://localhost:3000/castles/winterfell` and confirm: parchment background, Cinzel headings, EB Garamond body, the Godswood and Crypts sections render with their Markdown formatting. `Ctrl-C` when done.

- [ ] **Step 4: Verify it builds statically**

```bash
bun run build
```

Expected: build emits `out/castles/winterfell/index.html`. Sanity-check:

```bash
ls out/castles/winterfell/
```

Should contain `index.html`.

- [ ] **Step 5: Commit**

```bash
git add app/castles/ app/not-found.tsx
git commit -m "feat: castle detail page (statically rendered per slug)"
```

---

## Task 11: Homepage that links to Winterfell

**Files:**
- Modify: `app/page.tsx` (replace the Next.js default)

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link';
import { ParchmentLayout } from '@/components/ParchmentLayout';
import { loadAllCastles } from '@/lib/content';

export default async function Home() {
  const castles = await loadAllCastles();
  const visible = castles.filter((c) => !c.frontmatter.draft);

  return (
    <ParchmentLayout>
      <h1>Atlas of the North</h1>
      <p className="subtitle">An interactive chronicle of the lands beyond the Neck.</p>

      <p className="drop-cap">
        From the Wall to the Neck, the North is the largest of the Seven Kingdoms,
        a realm of pine and stone, of cold winds and old gods. This atlas charts its
        castles, its houses, its battles, and the long history of those who shaped it.
      </p>

      <h2>Castles</h2>
      <ul>
        {visible.map((c) => (
          <li key={c.frontmatter.slug}>
            <Link href={`/castles/${c.frontmatter.slug}/`}>{c.frontmatter.name}</Link>
          </li>
        ))}
      </ul>
    </ParchmentLayout>
  );
}
```

- [ ] **Step 2: Verify in dev mode**

```bash
bun dev
```

Open `http://localhost:3000` and confirm:
- Parchment background, "Atlas of the North" headline in Cinzel
- A subtitle in italic
- A drop-cap paragraph
- "Castles" heading
- A link to "Winterfell" that, when clicked, navigates to the castle page

`Ctrl-C` when done.

- [ ] **Step 3: Verify static build**

```bash
bun run build
ls out/
```

Expected: `out/index.html` and `out/castles/winterfell/index.html` both exist.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: homepage listing castles in the North"
```

---

## Task 12: Netlify deploy config

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Create `netlify.toml`**

```toml
[build]
  command = "bun run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/404.html"
  status = 404
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "chore: Netlify build config"
```

- [ ] **Step 3 (manual, not part of plan execution):** Connect the GitHub repo to Netlify via the Netlify web UI when you're ready to deploy. The `netlify.toml` will be picked up automatically.

---

## Task 13: Final verification

- [ ] **Step 1: All tests pass**

```bash
bun run test
```

Expected: all schema, content, and relation tests pass.

- [ ] **Step 2: Lint passes**

```bash
bun run lint
```

Expected: no errors. (Warnings about unused imports are OK if any.)

- [ ] **Step 3: Static build succeeds**

```bash
bun run build
```

Expected: clean build, no errors.

- [ ] **Step 4: Static output is self-contained**

```bash
ls -la out/
ls -la out/castles/winterfell/
```

Expected:
- `out/index.html` exists
- `out/castles/winterfell/index.html` exists
- `out/_next/static/...` contains fonts, CSS, JS chunks

- [ ] **Step 5: Serve `out/` locally to verify the truly-static output works without Next.js runtime**

```bash
npx -y serve out -p 4000
```

Open `http://localhost:4000`, navigate from the homepage to Winterfell, and confirm the page works without `bun dev`. This proves Netlify will be able to serve it. `Ctrl-C` when done.

- [ ] **Step 6: Push to GitHub**

```bash
git push origin main
```

---

## Self-review notes

Coverage against the spec sections:

| Spec section | Covered here | Deferred to later plan |
|---|---|---|
| Overview, non-goals | n/a (informational) | n/a |
| System architecture | Authoring + Build + Runtime all wired (sans scraper) | Scraper-side authoring |
| Tech stack | Next.js, TS, Markdown, gray-matter, remark, zod, vitest, fonts, Netlify ✓ | react-svg-pan-zoom, react-flow, dagre, next-pwa |
| Data model | All four schemas ✓; one castle + one house loaded ✓ | People + Events data files (validate via schemas only here) |
| Map view | n/a | Plan 2 |
| Timeline view | n/a | Plan 3 |
| Houses view + detail | n/a | Plan 4 |
| Family Tree view | n/a | Plan 5 |
| Aesthetic / visual system | Palette, fonts, drop caps, parchment textures ✓ | Motion details, OG image generation |
| Scraping pipeline | n/a | Plan 6 |
| PWA & offline | n/a | Plan 7 |
| Routing | Castle slug route ✓; homepage ✓ | All other entity routes |
| Project structure | Matches spec with `content/`, `lib/`, `components/`, `app/`, `styles/`, `public/` ✓ | `scripts/` |
| Testing posture | Schema + relation tests with Vitest ✓ | n/a |

No placeholders. No "TBD"s. All step code is concrete. Type names (`Castle`, `House`, `Person`, `Event`, `Source`) used consistently across `lib/schemas.ts`, `lib/content.ts`, `lib/relations.ts`, and the page components.
