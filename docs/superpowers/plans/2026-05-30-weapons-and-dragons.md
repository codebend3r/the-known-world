# Weapons + Dragons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two new top-level sections — `/weapons/` and `/dragons/` — backed by their own content collections, with full cross-linking to existing houses and characters and a small seed of canonical entries.

**Architecture:** New `content/weapons/` and `content/dragons/` collections, each with a Zod schema in `lib/schemas.ts`, loaders in `lib/content.ts`, an index page (`FilteredWeaponList` / `FilteredDragonList` mirroring `FilteredHouseList`), and a per-slug detail page with an infobox + prose body. House frontmatter's `ancestral-weapons` migrates from inline `HouseInfoEntry[]` to a flat `string[]` of slugs. Common `InfoRow` / `InfoEntry` primitives hoist out of `HouseInfobox` into a shared `Infobox` module. `MainMenu` grows from 3 to 5 tiles (Maps, Timeline, Houses, Weapons, Dragons) using `grid-template-areas` to centre the bottom row.

**Tech Stack:** Next.js 16 App Router (`output: 'export'`), React 19, TypeScript 5, Zod 4, Vitest 4 + jsdom + `@testing-library/react`, Bun for scripts.

**Spec:** `docs/superpowers/specs/2026-05-30-weapons-and-dragons-design.md`

## Conventions reminder

- Commit subjects start with `TKW:` (see `tkw-git-commit-and-pr-format` skill); no `Co-Authored-By` trailer, no AI attribution anywhere in commit messages.
- Run `bun run test` before each commit (this invokes `vitest run` — `bun test` uses Bun's built-in runner and is incompatible with the repo's jsdom setup).
- All in-repo imports use the `@/` alias.
- CSS modules use `camelCase` class names; compose with `cx` from `@/lib/cx`.
- Never use `grid-column: 1 / -1`; always declare `grid-template-areas` on the parent.
- Never use `margin` for layout spacing; prefer `display: grid` with `gap` and `padding`.

## File map

**Created:**

- `lib/schemas.ts` (modify) — add `WeaponSchema`, `DragonSchema`; change `HouseSchema['ancestral-weapons']`.
- `lib/content.ts` (modify) — add `loadWeapon` / `loadAllWeapons` / `loadDragon` / `loadAllDragons`.
- `lib/prose-links.ts` (modify) — extend `ProseLinkTarget['kind']` and `buildProseLinkIndex` signature.
- `components/Infobox.tsx` (new) — hoisted `InfoRow`, `InfoEntry`, `humanizeSlug` primitives.
- `components/Infobox.module.scss` (new) — `.row`, `.note` (and related) styles moved from `HouseInfobox.module.scss`.
- `components/WeaponInfobox.tsx` + `.test.tsx` (new — no `.module.scss`; reuses `HouseInfobox.module.scss` + `Infobox.module.scss`).
- `components/DragonInfobox.tsx` + `.test.tsx` (new — same reuse pattern).
- `components/FilteredWeaponList.tsx` + `.module.scss` + `.test.tsx` (new).
- `components/FilteredDragonList.tsx` + `.module.scss` + `.test.tsx` (new).
- `app/weapons/page.tsx` (new — index; no page-local CSS needed).
- `app/weapons/[slug]/page.tsx` + `page.module.scss` (new — detail).
- `app/dragons/page.tsx` (new — index; no page-local CSS needed).
- `app/dragons/[slug]/page.tsx` + `page.module.scss` (new — detail).
- `content/weapons/{blackfyre,dark-sister,heartsbane,ice}.md` (new).
- `content/dragons/{balerion,vhagar,meraxes,caraxes,vermithor,sunfyre,cannibal}.md` (new).

**Modified:**

- `components/HouseInfobox.tsx` / `.test.tsx` — import primitives; resolve weapon slugs; add Dragons row.
- `components/HouseInfobox.module.scss` — remove migrated rules.
- `components/MainMenu.tsx` / `.module.scss` / `.test.tsx` — 5 tiles, `grid-template-areas`.
- `components/SiteMenu.tsx` / `.test.tsx` — 6 nav entries.
- `app/houses/[slug]/page.tsx` — pass `weaponsBySlug` + dragons-for-house; pass weapons + dragons to `buildProseLinkIndex`.
- `app/characters/[slug]/page.tsx` — surface "Bore" + "Rode"; pass weapons + dragons to `buildProseLinkIndex`.
- `app/characters/[slug]/page.module.scss` — styles for the new sections (if needed).
- `content/houses/targaryen.md` — `ancestral-weapons` → `[blackfyre, dark-sister]`.
- `content/houses/blackfyre.md` — `ancestral-weapons` → `[blackfyre]`.
- `content/houses/stark.md` — add `ancestral-weapons: [ice]`.
- `content/houses/tarly.md` — add `ancestral-weapons: [heartsbane]`.

---

### Task 1: Add `WeaponSchema` + `DragonSchema`; migrate `HouseSchema['ancestral-weapons']`

**Files:**

- Modify: `lib/schemas.ts`
- Modify: `lib/schemas.test.ts`
- Modify: `content/houses/targaryen.md`
- Modify: `content/houses/blackfyre.md`

- [ ] **Step 1: Write the failing schema tests**

Append to `lib/schemas.test.ts` after the existing `EventSchema` block, and update the existing `HouseSchema` test that uses inline weapon entries.

```ts
// Add import:
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  WeaponSchema,
  DragonSchema,
} from "@/lib/schemas";

describe("WeaponSchema", () => {
  it("parses a Valyrian-steel sword bound to a house", () => {
    const input = {
      slug: "blackfyre",
      name: "Blackfyre",
      type: "sword",
      material: "valyrian-steel",
      status: "lost",
      "origin-house": "targaryen",
      "current-house": null,
      wielders: ["aegon-i-targaryen", "daemon-i-blackfyre"],
      aliases: [],
      mentions: ["targaryen", "blackfyre"],
      sources: [{ type: "awoiaf", url: "https://example" }],
      draft: false,
    };
    expect(() => WeaponSchema.parse(input)).not.toThrow();
  });

  it("rejects an unknown material", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "sword",
      material: "mithril",
      status: "extant",
      "current-house": null,
      wielders: [],
      aliases: [],
      mentions: [],
      sources: [],
    };
    expect(() => WeaponSchema.parse(input)).toThrow();
  });

  it("defaults arrays and draft when omitted", () => {
    const input = {
      slug: "x",
      name: "X",
      type: "dagger",
      material: "steel",
      status: "extant",
      "current-house": null,
      sources: [],
    };
    const parsed = WeaponSchema.parse(input);
    expect(parsed.wielders).toEqual([]);
    expect(parsed.aliases).toEqual([]);
    expect(parsed.mentions).toEqual([]);
    expect(parsed.draft).toBe(false);
  });
});

describe("DragonSchema", () => {
  it("parses a Targaryen dragon with a rider chain", () => {
    const input = {
      slug: "vhagar",
      name: "Vhagar",
      color: "bronze and green",
      size: "monstrous",
      hatched: { year: -52, era: "BC", precision: "decade" },
      died: { year: 130, era: "AC", precision: "year" },
      status: "dead",
      house: "targaryen",
      riders: ["visenya-targaryen", "aemond-targaryen"],
      aliases: [],
      mentions: ["targaryen"],
      sources: [],
      draft: false,
    };
    expect(() => DragonSchema.parse(input)).not.toThrow();
  });

  it("parses a wild dragon with no house and no riders", () => {
    const input = {
      slug: "cannibal",
      name: "The Cannibal",
      hatched: null,
      died: null,
      status: "wild",
      house: null,
      sources: [],
    };
    const parsed = DragonSchema.parse(input);
    expect(parsed.house).toBeNull();
    expect(parsed.riders).toEqual([]);
  });

  it("rejects an unknown status", () => {
    const input = {
      slug: "x",
      name: "X",
      hatched: null,
      died: null,
      status: "sleeping",
      house: null,
      sources: [],
    };
    expect(() => DragonSchema.parse(input)).toThrow();
  });
});
```

Also **replace** the existing `'parses an infobox-rich house ...'` test in the `HouseSchema` block — its `ancestral-weapons: [{ name: 'Blackfyre' }, { name: 'Dark Sister' }]` now has the wrong shape. Change it to:

```ts
      'ancestral-weapons': ['blackfyre', 'dark-sister'],
```

(Everything else in that test object stays the same.)

- [ ] **Step 2: Run the failing tests**

Run: `bun run test lib/schemas.test.ts`
Expected: FAIL — `WeaponSchema` / `DragonSchema` undefined; the updated House test still passes against the _old_ `HouseInfoEntry[]` shape until we change the schema.

- [ ] **Step 3: Add the new schemas and migrate `HouseSchema['ancestral-weapons']`**

In `lib/schemas.ts`, **after** the `CastleSchema` definition and before `HouseInfoEntrySchema`, add the weapon/dragon enums and schemas:

```ts
const WeaponTypeSchema = z.enum([
  "sword",
  "greatsword",
  "longsword",
  "dagger",
  "axe",
  "spear",
  "bow",
  "horn",
  "other",
]);

const MaterialSchema = z.enum([
  "valyrian-steel",
  "dragonglass",
  "dragonbone",
  "steel",
  "other",
]);

const WeaponStatusSchema = z.enum(["extant", "lost", "destroyed"]);

export const WeaponSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  type: WeaponTypeSchema,
  material: MaterialSchema,
  forged: DateSchema.optional(),
  destroyed: DateSchema.optional(),
  status: WeaponStatusSchema,
  "origin-house": z.string().optional(),
  "current-house": z.string().nullable(),
  wielders: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});

const DragonStatusSchema = z.enum(["extant", "dead", "lost", "wild"]);
const DragonSizeSchema = z.enum([
  "hatchling",
  "young",
  "mature",
  "great",
  "monstrous",
]);

export const DragonSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  size: DragonSizeSchema.optional(),
  hatched: DateSchema.nullable(),
  died: DateSchema.nullable(),
  status: DragonStatusSchema,
  house: z.string().nullable(),
  riders: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  draft: z.boolean().default(false),
});
```

In `HouseSchema`, change the `'ancestral-weapons'` line from:

```ts
  'ancestral-weapons': z.array(HouseInfoEntrySchema).optional(),
```

to:

```ts
  'ancestral-weapons': z.array(z.string()).optional(),
```

At the bottom of the file, add the new type exports next to the existing ones:

```ts
export type Weapon = z.infer<typeof WeaponSchema>;
export type Dragon = z.infer<typeof DragonSchema>;
```

- [ ] **Step 4: Migrate the two house files that use `ancestral-weapons`**

In `content/houses/targaryen.md`, replace:

```yaml
ancestral-weapons:
  - name: Blackfyre
  - name: Dark Sister
```

with:

```yaml
ancestral-weapons:
  - blackfyre
  - dark-sister
```

In `content/houses/blackfyre.md`, replace:

```yaml
ancestral-weapons:
  - name: Blackfyre
    note: the Valyrian steel sword of Aegon the Conqueror, lost with Bittersteel after the Redgrass Field
```

with:

```yaml
ancestral-weapons:
  - blackfyre
```

(The `note:` content moves onto the `blackfyre.md` weapon entry when it's seeded in Task 11.)

- [ ] **Step 5: Run the schema test file**

Run: `bun run test lib/schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full test + typecheck suite**

Run: `bun run system-check`
Expected: PASS. `HouseInfobox.tsx` currently reads `house['ancestral-weapons']` as `HouseInfoEntry[]` and passes it directly to `<InfoRow entries=...>`. After the schema change, the type is `string[]`. This is a type error that will surface in typecheck. **Fix it inline** before continuing by changing the `weapons` derivation in `components/HouseInfobox.tsx` from:

```ts
const weapons = house["ancestral-weapons"] ?? [];
```

to (interim form — Task 10 makes it slug-resolving):

```ts
const weapons: HouseInfoEntry[] = (house["ancestral-weapons"] ?? []).map(
  (slug) => ({ slug, name: humanizeSlug(slug) }),
);
```

Re-run `bun run system-check`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/schemas.ts lib/schemas.test.ts \
        content/houses/targaryen.md content/houses/blackfyre.md \
        components/HouseInfobox.tsx
git commit -m "$(cat <<'EOF'
TKW: add `WeaponSchema` + `DragonSchema`; flatten house `ancestral-weapons`

- `WeaponSchema` covers type, material, status, origin/current house, wielders chain
- `DragonSchema` covers color, size, hatched/died, status, house, riders chain
- `HouseSchema['ancestral-weapons']` becomes a flat slug list
- migrate `targaryen.md` and `blackfyre.md` to the new shape
- `HouseInfobox` projects the slug list through `humanizeSlug` for now
EOF
)"
```

---

### Task 2: Add weapon + dragon content loaders

**Files:**

- Modify: `lib/content.ts`
- Modify: `lib/content.test.ts`

- [ ] **Step 1: Write the failing loader tests**

Append to `lib/content.test.ts`:

```ts
import {
  loadCastle,
  loadAllCastles,
  renderMarkdown,
  loadAllWeapons,
  loadAllDragons,
  loadWeapon,
  loadDragon,
} from "@/lib/content";

// ... existing describe blocks ...

describe("loadAllWeapons", () => {
  it("returns an empty array when no weapons exist", async () => {
    const all = await loadAllWeapons();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe("loadAllDragons", () => {
  it("returns an empty array when no dragons exist", async () => {
    const all = await loadAllDragons();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe("loadWeapon", () => {
  it("throws when the weapon slug does not exist", async () => {
    await expect(loadWeapon("does-not-exist")).rejects.toThrow();
  });
});

describe("loadDragon", () => {
  it("throws when the dragon slug does not exist", async () => {
    await expect(loadDragon("does-not-exist")).rejects.toThrow();
  });
});
```

(Round-trip tests against actual seeded files are added in Tasks 11 and 12 after content lands.)

- [ ] **Step 2: Run the failing tests**

Run: `bun run test lib/content.test.ts`
Expected: FAIL — the four new loader functions are not exported.

- [ ] **Step 3: Add the loaders**

In `lib/content.ts`, change the import line:

```ts
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  type Castle,
  type House,
  type Character,
  type Event,
} from "@/lib/schemas";
```

to:

```ts
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  WeaponSchema,
  DragonSchema,
  type Castle,
  type House,
  type Character,
  type Event,
  type Weapon,
  type Dragon,
} from "@/lib/schemas";
```

Change the `loadFile` / `loadAll` `type` parameter to include the new collections:

```ts
async function loadFile<T>(
  type: 'castles' | 'houses' | 'characters' | 'events' | 'weapons' | 'dragons',
  ...
)

async function loadAll<T>(
  type: 'castles' | 'houses' | 'characters' | 'events' | 'weapons' | 'dragons',
  ...
)
```

Below the existing `loadAllEvents` export, add:

```ts
export const loadWeapon = (slug: string) =>
  loadFile<Weapon>("weapons", slug, WeaponSchema);
export const loadDragon = (slug: string) =>
  loadFile<Dragon>("dragons", slug, DragonSchema);

export const loadAllWeapons = () => loadAll<Weapon>("weapons", WeaponSchema);
export const loadAllDragons = () => loadAll<Dragon>("dragons", DragonSchema);
```

- [ ] **Step 4: Run the loader tests**

Run: `bun run test lib/content.test.ts`
Expected: PASS.

- [ ] **Step 5: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content.ts lib/content.test.ts
git commit -m "$(cat <<'EOF'
TKW: add `loadWeapon` / `loadAllWeapons` / `loadDragon` / `loadAllDragons`

- mirrors the `loadCastle` / `loadHouse` shape
- empty-dir test confirms `loadAll*` returns `[]` until content lands
EOF
)"
```

---

### Task 3: Hoist `InfoRow` and `InfoEntry` into a shared `Infobox` module

**Files:**

- Create: `components/Infobox.tsx`
- Create: `components/Infobox.module.scss`
- Modify: `components/HouseInfobox.tsx`
- Modify: `components/HouseInfobox.module.scss`

- [ ] **Step 1: Create the shared module**

Create `components/Infobox.tsx`:

```tsx
import Link from "next/link";
import type { HouseInfoEntry } from "@/lib/schemas";
import styles from "@/components/Infobox.module.scss";

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

type EntryProps = {
  entry: HouseInfoEntry;
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

export function InfoEntry({ entry, hrefPrefix, exists }: EntryProps) {
  const canLink =
    !!entry.slug && !!hrefPrefix && (exists ? exists(entry.slug) : true);
  return (
    <li>
      {canLink ? (
        <Link href={`${hrefPrefix}/${entry.slug}/`}>{entry.name}</Link>
      ) : (
        <span>{entry.name}</span>
      )}
      {entry.note && <span className={styles.note}> ({entry.note})</span>}
    </li>
  );
}

type RowProps = {
  label: string;
  entries: HouseInfoEntry[];
  hrefPrefix?: string;
  exists?: (slug: string) => boolean;
};

export function InfoRow({ label, entries, hrefPrefix, exists }: RowProps) {
  if (entries.length === 0) return null;
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>
        <ul>
          {entries.map((entry, i) => (
            <InfoEntry
              key={`${entry.name}-${i}`}
              entry={entry}
              hrefPrefix={hrefPrefix}
              exists={exists}
            />
          ))}
        </ul>
      </dd>
    </div>
  );
}
```

Create `components/Infobox.module.scss` with the rules currently living in `HouseInfobox.module.scss` for `.row` and `.note`:

```css
.row {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  gap: 0.5rem;
  align-items: baseline;
}

.row dt {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ink-faded);
  font-weight: 500;
}

.row dd {
  color: var(--ink);
  line-height: 1.35;
}

.row ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.row a {
  color: var(--ink);
  text-decoration-color: rgba(107, 68, 35, 0.35);
}

.row a:hover {
  color: var(--gold-leaf);
}

.note {
  color: var(--ink-faded);
  font-style: italic;
  font-size: 0.92em;
}

@media (max-width: 767.98px) {
  /* md */
  .row {
    grid-template-columns: 5.5rem 1fr;
  }
}
```

- [ ] **Step 2: Update `HouseInfobox` to import the primitives**

In `components/HouseInfobox.tsx`:

- Remove the local `humanizeSlug`, `InfoEntry`, `InfoRow`, `EntryProps`, `RowProps` definitions.
- Add: `import { InfoRow, humanizeSlug } from '@/components/Infobox';`
- Remove the unused `Link` and `HouseInfoEntry` imports if they become unused (verify by reading the file after edits).
- Keep `import styles from '@/components/HouseInfobox.module.scss';` — the file still owns `.infobox`, `.sigil`, `.sigilFill`, `.rows`.

In `components/HouseInfobox.module.scss`, delete the migrated rules: the `.row { ... }`, `.row dt { ... }`, `.row dd { ... }`, `.row ul { ... }`, `.row a { ... }`, `.row a:hover { ... }`, `.note { ... }`, and the `@media` block that overrides `.row` columns. Keep `.infobox`, `.sigil`, `.sigilFill`, `.rows`, and the `.infobox` mobile width override.

- [ ] **Step 3: Run the existing infobox test**

Run: `bun run test components/HouseInfobox.test.tsx`
Expected: PASS — the public component contract is unchanged.

- [ ] **Step 4: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/Infobox.tsx components/Infobox.module.scss \
        components/HouseInfobox.tsx components/HouseInfobox.module.scss
git commit -m "$(cat <<'EOF'
TKW: hoist `InfoRow` / `InfoEntry` / `humanizeSlug` into `components/Infobox`

- shared primitives for the three infobox flavours (`House`, `Weapon`, `Dragon`)
- `.row` and `.note` styles move from `HouseInfobox.module.scss` to `Infobox.module.scss`
- `HouseInfobox` re-imports without behavior change
EOF
)"
```

---

### Task 4: Build `WeaponInfobox` + `/weapons/[slug]/` detail route

**Files:**

- Create: `components/WeaponInfobox.tsx`
- Create: `components/WeaponInfobox.test.tsx`
- Create: `app/weapons/[slug]/page.tsx`
- Create: `app/weapons/[slug]/page.module.scss`

- [ ] **Step 1: Write the failing infobox test**

Create `components/WeaponInfobox.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeaponInfobox } from "@/components/WeaponInfobox";
import type { Weapon, House, Character } from "@/lib/schemas";

const blackfyre: Weapon = {
  slug: "blackfyre",
  name: "Blackfyre",
  type: "sword",
  material: "valyrian-steel",
  status: "lost",
  "origin-house": "targaryen",
  "current-house": null,
  wielders: ["aegon-i-targaryen", "daemon-i-blackfyre"],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const targaryen: House = {
  slug: "targaryen",
  name: "House Targaryen",
  seat: "dragonstone",
  liege: null,
  words: "Fire and Blood",
  sigil: { description: "" },
  founded: { year: -114, era: "BC", precision: "year" },
  status: "exiled",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const aegon: Character = {
  slug: "aegon-i-targaryen",
  name: "Aegon I Targaryen",
  sex: "m",
  born: { year: -27, era: "BC", precision: "year" },
  died: { year: 37, era: "AC", precision: "year" },
  "primary-house": "targaryen",
  "also-of-houses": [],
  parents: [],
  spouses: [],
  children: [],
  titles: [],
  aliases: [],
  mentions: [],
  placeholder: false,
  "placeholder-reason": null,
  sources: [],
  draft: false,
};

const housesBySlug = new Map<string, House>([["targaryen", targaryen]]);
const charactersBySlug = new Map<string, Character>([
  ["aegon-i-targaryen", aegon],
]);

describe("WeaponInfobox", () => {
  it("renders type, material, and status rows", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("Material")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("links the origin house to its detail page", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /house targaryen/i });
    expect(link.getAttribute("href")).toBe("/houses/targaryen/");
  });

  it("renders linkable wielders that exist in the characters map", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /aegon i targaryen/i });
    expect(link.getAttribute("href")).toBe("/characters/aegon-i-targaryen/");
  });

  it("renders unknown wielders as plain text", () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /daemon i blackfyre/i }),
    ).toBeNull();
    expect(screen.getByText("Daemon I Blackfyre")).toBeDefined();
  });

  it('shows "Lost" for the current-house row when null and status is lost', () => {
    render(
      <WeaponInfobox
        weapon={blackfyre}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Lost")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/WeaponInfobox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `WeaponInfobox`**

Create `components/WeaponInfobox.tsx`:

```tsx
import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { InfoRow, humanizeSlug } from "@/components/Infobox";
import type { Weapon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox.module.scss";
import styles from "@/components/Infobox.module.scss";

type Props = {
  weapon: Weapon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

const TYPE_LABEL: Record<Weapon["type"], string> = {
  sword: "Sword",
  greatsword: "Greatsword",
  longsword: "Longsword",
  dagger: "Dagger",
  axe: "Axe",
  spear: "Spear",
  bow: "Bow",
  horn: "Horn",
  other: "Other",
};

const MATERIAL_LABEL: Record<Weapon["material"], string> = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "Other",
};

const STATUS_LABEL: Record<Weapon["status"], string> = {
  extant: "Extant",
  lost: "Lost",
  destroyed: "Destroyed",
};

function formatDate(d: NonNullable<Weapon["forged"]>): string {
  const { year, era, precision } = d;
  if (era === "AC" || era === "BC") return `${Math.abs(year)} ${era}`;
  const label = era
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return precision === "legendary" ? `${label} (legendary)` : label;
}

function houseLabel(slug: string, housesBySlug: Map<string, House>): string {
  return housesBySlug.get(slug)?.name ?? `House ${humanizeSlug(slug)}`;
}

export function WeaponInfobox({
  weapon,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const origin = weapon["origin-house"];
  const current = weapon["current-house"];
  const originHouse = origin ? housesBySlug.get(origin) : undefined;

  const originEntries: HouseInfoEntry[] = origin
    ? [{ slug: origin, name: houseLabel(origin, housesBySlug) }]
    : [];

  const currentEntries: HouseInfoEntry[] = current
    ? [{ slug: current, name: houseLabel(current, housesBySlug) }]
    : [];

  const wielders: HouseInfoEntry[] = weapon.wielders.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const aliases: HouseInfoEntry[] = weapon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${weapon.name} infobox`}
    >
      {originHouse && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={originHouse.slug}
            name={shortHouseName(originHouse.name)}
            region={regionForHouse(originHouse.slug, housesBySlug)}
            decorative
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        <div className={styles.row}>
          <dt>Type</dt>
          <dd>{TYPE_LABEL[weapon.type]}</dd>
        </div>
        <div className={styles.row}>
          <dt>Material</dt>
          <dd>{MATERIAL_LABEL[weapon.material]}</dd>
        </div>
        {weapon.forged && (
          <div className={styles.row}>
            <dt>Forged</dt>
            <dd>{formatDate(weapon.forged)}</dd>
          </div>
        )}
        {weapon.destroyed && (
          <div className={styles.row}>
            <dt>Destroyed</dt>
            <dd>{formatDate(weapon.destroyed)}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[weapon.status]}</dd>
        </div>
        <InfoRow
          label="Origin house"
          entries={originEntries}
          hrefPrefix="/houses"
          exists={(s) => housesBySlug.has(s)}
        />
        {current ? (
          <InfoRow
            label="Current house"
            entries={currentEntries}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ) : (
          <div className={styles.row}>
            <dt>Current house</dt>
            <dd>{weapon.status === "destroyed" ? "Destroyed" : "Lost"}</dd>
          </div>
        )}
        <InfoRow
          label={wielders.length === 1 ? "Wielder" : "Wielders"}
          entries={wielders}
          hrefPrefix="/characters"
          exists={(s) => {
            const c = charactersBySlug.get(s);
            return !!c && !c.placeholder;
          }}
        />
        <InfoRow label="Aliases" entries={aliases} />
      </dl>
    </aside>
  );
}
```

Note: `WeaponInfobox` imports `styles` from `@/components/Infobox.module.scss` directly (the `.row` shape lives there now). No `WeaponInfobox.module.scss` file is needed — `infoboxStyles` covers the shell (`.infobox`, `.sigil`, `.sigilFill`, `.rows`), and `styles` covers the row primitives.

- [ ] **Step 4: Run the test**

Run: `bun run test components/WeaponInfobox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create the detail-page route**

Create `app/weapons/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadWeapon,
  loadAllWeapons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from "@/lib/content";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { Sources } from "@/components/Sources";
import { WeaponInfobox } from "@/components/WeaponInfobox";
import styles from "@/app/weapons/[slug]/page.module.scss";

export async function generateStaticParams() {
  const weapons = await loadAllWeapons();
  return weapons
    .filter((w) => !w.frontmatter.draft)
    .map((w) => ({ slug: w.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const weapon = await loadWeapon(slug).catch(() => null);
  if (!weapon) return { title: "Not found" };
  return {
    title: `${weapon.frontmatter.name} · Atlas of the Known World`,
  };
}

const TYPE_NOUN: Record<string, string> = {
  sword: "sword",
  greatsword: "greatsword",
  longsword: "longsword",
  dagger: "dagger",
  axe: "axe",
  spear: "spear",
  bow: "bow",
  horn: "horn",
  other: "arm",
};

const MATERIAL_ADJ: Record<string, string> = {
  "valyrian-steel": "Valyrian steel",
  dragonglass: "Dragonglass",
  dragonbone: "Dragonbone",
  steel: "Steel",
  other: "",
};

export default async function WeaponPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [weapon, allHouses, allCharacters] = await Promise.all([
    loadWeapon(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
  ]);
  if (!weapon) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );

  const fm = weapon.frontmatter;
  const html =
    fm && weapon.body.trim() ? await renderMarkdown(weapon.body) : "";
  const originHouse = fm["origin-house"]
    ? housesBySlug.get(fm["origin-house"])
    : undefined;

  const subtitleParts = [MATERIAL_ADJ[fm.material], TYPE_NOUN[fm.type]].filter(
    Boolean,
  );
  const subtitle = [
    subtitleParts.join(" "),
    originHouse ? `of ${originHouse.name}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <WeaponInfobox
          weapon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={styles.infobox}
        />
        <div className={styles.main}>
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/weapons/">← All Weapons</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </ParchmentLayout>
  );
}
```

Create `app/weapons/[slug]/page.module.scss` by copying the entire contents of `app/houses/[slug]/page.module.scss` (the two routes have the same detail-layout grid). Delete the `.tree` rule from the copy.

- [ ] **Step 6: Run system check**

Run: `bun run system-check`
Expected: PASS. The route file references content that doesn't exist yet, but `generateStaticParams` returns `[]` (since `loadAllWeapons()` returns `[]`) so the build emits no per-slug pages.

- [ ] **Step 7: Commit**

```bash
git add components/WeaponInfobox.tsx components/WeaponInfobox.test.tsx \
        'app/weapons/[slug]/page.tsx' 'app/weapons/[slug]/page.module.scss'
git commit -m "$(cat <<'EOF'
TKW: add `WeaponInfobox` and `/weapons/[slug]/` detail route

- `WeaponInfobox` reuses `Infobox` primitives and `HouseInfobox.module.scss` shell
- detail page mirrors `/houses/[slug]/`: sigil + infobox aside, prose body, sources
- `generateStaticParams` returns `[]` until weapons are seeded
EOF
)"
```

---

### Task 5: Build `DragonInfobox` + `/dragons/[slug]/` detail route

**Files:**

- Create: `components/DragonInfobox.tsx`
- Create: `components/DragonInfobox.test.tsx`
- Create: `app/dragons/[slug]/page.tsx`
- Create: `app/dragons/[slug]/page.module.scss`

- [ ] **Step 1: Write the failing infobox test**

Create `components/DragonInfobox.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragonInfobox } from "@/components/DragonInfobox";
import type { Dragon, House, Character } from "@/lib/schemas";

const targaryen: House = {
  slug: "targaryen",
  name: "House Targaryen",
  seat: "dragonstone",
  liege: null,
  words: "Fire and Blood",
  sigil: { description: "" },
  founded: { year: -114, era: "BC", precision: "year" },
  status: "exiled",
  "sworn-from": [],
  "cadet-houses": [],
  mentions: [],
  sources: [],
  draft: false,
};

const vhagar: Dragon = {
  slug: "vhagar",
  name: "Vhagar",
  color: "bronze and green",
  size: "monstrous",
  hatched: { year: -52, era: "BC", precision: "decade" },
  died: { year: 130, era: "AC", precision: "year" },
  status: "dead",
  house: "targaryen",
  riders: ["visenya-targaryen", "aemond-targaryen"],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const cannibal: Dragon = {
  slug: "cannibal",
  name: "The Cannibal",
  hatched: null,
  died: null,
  status: "wild",
  house: null,
  riders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const housesBySlug = new Map<string, House>([["targaryen", targaryen]]);
const charactersBySlug = new Map<string, Character>();

describe("DragonInfobox", () => {
  it("renders the house link for a Targaryen dragon", () => {
    render(
      <DragonInfobox
        dragon={vhagar}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    const link = screen.getByRole("link", { name: /house targaryen/i });
    expect(link.getAttribute("href")).toBe("/houses/targaryen/");
  });

  it("renders the rider chain in order", () => {
    render(
      <DragonInfobox
        dragon={vhagar}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Visenya Targaryen")).toBeDefined();
    expect(screen.getByText("Aemond Targaryen")).toBeDefined();
  });

  it('omits the house row and shows "Wild" for a wild dragon', () => {
    render(
      <DragonInfobox
        dragon={cannibal}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(screen.getByText("Wild")).toBeDefined();
    expect(screen.queryByRole("link", { name: /house/i })).toBeNull();
  });

  it("suppresses the sigil for a wild dragon", () => {
    const { container } = render(
      <DragonInfobox
        dragon={cannibal}
        housesBySlug={housesBySlug}
        charactersBySlug={charactersBySlug}
      />,
    );
    expect(container.querySelector(".sigil")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/DragonInfobox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `DragonInfobox`**

Create `components/DragonInfobox.tsx`:

```tsx
import { Sigil } from "@/components/Sigil";
import { cx } from "@/lib/cx";
import { regionForHouse } from "@/lib/regions";
import { InfoRow, humanizeSlug } from "@/components/Infobox";
import type { Dragon, House, Character, HouseInfoEntry } from "@/lib/schemas";
import infoboxStyles from "@/components/HouseInfobox.module.scss";
import sharedStyles from "@/components/Infobox.module.scss";

type Props = {
  dragon: Dragon;
  housesBySlug: Map<string, House>;
  charactersBySlug: Map<string, Character>;
  className?: string;
};

function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

const STATUS_LABEL: Record<Dragon["status"], string> = {
  extant: "Extant",
  dead: "Dead",
  lost: "Lost",
  wild: "Wild",
};

const SIZE_LABEL: Record<NonNullable<Dragon["size"]>, string> = {
  hatchling: "Hatchling",
  young: "Young",
  mature: "Mature",
  great: "Great",
  monstrous: "Monstrous",
};

function formatDate(d: NonNullable<Dragon["hatched"]>): string {
  const { year, era, precision } = d;
  if (era === "AC" || era === "BC") return `${Math.abs(year)} ${era}`;
  const label = era
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return precision === "legendary" ? `${label} (legendary)` : label;
}

export function DragonInfobox({
  dragon,
  housesBySlug,
  charactersBySlug,
  className,
}: Props) {
  const house = dragon.house ? housesBySlug.get(dragon.house) : undefined;

  const houseEntries: HouseInfoEntry[] = dragon.house
    ? [
        {
          slug: dragon.house,
          name: house?.name ?? `House ${humanizeSlug(dragon.house)}`,
        },
      ]
    : [];

  const riders: HouseInfoEntry[] = dragon.riders.map((slug) => ({
    slug,
    name: charactersBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }));

  const aliases: HouseInfoEntry[] = dragon.aliases.map((a) => ({ name: a }));

  return (
    <aside
      className={cx(infoboxStyles.infobox, className)}
      aria-label={`${dragon.name} infobox`}
    >
      {house && (
        <div className={infoboxStyles.sigil}>
          <Sigil
            slug={house.slug}
            name={shortHouseName(house.name)}
            region={regionForHouse(house.slug, housesBySlug)}
            decorative
            className={infoboxStyles.sigilFill}
          />
        </div>
      )}

      <dl className={infoboxStyles.rows}>
        {dragon.color && (
          <div className={sharedStyles.row}>
            <dt>Color</dt>
            <dd>{dragon.color}</dd>
          </div>
        )}
        {dragon.size && (
          <div className={sharedStyles.row}>
            <dt>Size</dt>
            <dd>{SIZE_LABEL[dragon.size]}</dd>
          </div>
        )}
        {dragon.hatched && (
          <div className={sharedStyles.row}>
            <dt>Hatched</dt>
            <dd>{formatDate(dragon.hatched)}</dd>
          </div>
        )}
        {dragon.died && (
          <div className={sharedStyles.row}>
            <dt>Died</dt>
            <dd>{formatDate(dragon.died)}</dd>
          </div>
        )}
        <div className={sharedStyles.row}>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[dragon.status]}</dd>
        </div>
        {dragon.house ? (
          <InfoRow
            label="House"
            entries={houseEntries}
            hrefPrefix="/houses"
            exists={(s) => housesBySlug.has(s)}
          />
        ) : (
          <div className={sharedStyles.row}>
            <dt>House</dt>
            <dd>Wild</dd>
          </div>
        )}
        <InfoRow
          label={riders.length === 1 ? "Rider" : "Riders"}
          entries={riders}
          hrefPrefix="/characters"
          exists={(s) => {
            const c = charactersBySlug.get(s);
            return !!c && !c.placeholder;
          }}
        />
        <InfoRow label="Aliases" entries={aliases} />
      </dl>
    </aside>
  );
}
```

Note `humanizeSlug('visenya-targaryen')` → `"Visenya Targaryen"`, which is what the test expects.

- [ ] **Step 4: Run the test**

Run: `bun run test components/DragonInfobox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create the detail-page route**

Create `app/dragons/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadDragon,
  loadAllDragons,
  loadAllHouses,
  loadAllCharacters,
  renderMarkdown,
} from "@/lib/content";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { Sources } from "@/components/Sources";
import { DragonInfobox } from "@/components/DragonInfobox";
import { humanizeSlug } from "@/components/Infobox";
import styles from "@/app/dragons/[slug]/page.module.scss";

export async function generateStaticParams() {
  const dragons = await loadAllDragons();
  return dragons
    .filter((d) => !d.frontmatter.draft)
    .map((d) => ({ slug: d.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dragon = await loadDragon(slug).catch(() => null);
  if (!dragon) return { title: "Not found" };
  return {
    title: `${dragon.frontmatter.name} · Atlas of the Known World`,
  };
}

export default async function DragonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [dragon, allHouses, allCharacters] = await Promise.all([
    loadDragon(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
  ]);
  if (!dragon) notFound();

  const housesBySlug = new Map(allHouses.map((h) => [h.slug, h.frontmatter]));
  const charactersBySlug = new Map(
    allCharacters.map((c) => [c.slug, c.frontmatter]),
  );

  const fm = dragon.frontmatter;
  const html =
    fm && dragon.body.trim() ? await renderMarkdown(dragon.body) : "";
  const house = fm.house ? housesBySlug.get(fm.house) : undefined;
  const subtitle = house
    ? `Of ${house.name}`
    : fm.house
      ? `Of House ${humanizeSlug(fm.house)}`
      : "A wild dragon";

  return (
    <ParchmentLayout>
      <div className={styles.detail}>
        <div className={styles.heading}>
          <h1>{fm.name}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <DragonInfobox
          dragon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={styles.infobox}
        />
        <div className={styles.main}>
          {html && (
            <article
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          <p className={styles.back}>
            <Link href="/dragons/">← All Dragons</Link>
          </p>
          <Sources sources={fm.sources} />
        </div>
      </div>
    </ParchmentLayout>
  );
}
```

Create `app/dragons/[slug]/page.module.scss` as a copy of `app/weapons/[slug]/page.module.scss`.

- [ ] **Step 6: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/DragonInfobox.tsx components/DragonInfobox.test.tsx \
        'app/dragons/[slug]/page.tsx' 'app/dragons/[slug]/page.module.scss'
git commit -m "$(cat <<'EOF'
TKW: add `DragonInfobox` and `/dragons/[slug]/` detail route

- `DragonInfobox` shares `Infobox` primitives; suppresses sigil + house row for wild dragons
- detail page subtitle differentiates housed vs wild
- `generateStaticParams` returns `[]` until dragons are seeded
EOF
)"
```

---

### Task 6: Build `FilteredWeaponList` + `/weapons/` index route

**Files:**

- Create: `components/FilteredWeaponList.tsx`
- Create: `components/FilteredWeaponList.module.scss`
- Create: `components/FilteredWeaponList.test.tsx`
- Create: `app/weapons/page.tsx`
- Create: `app/weapons/page.module.scss`

- [ ] **Step 1: Write the failing list test**

Create `components/FilteredWeaponList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  FilteredWeaponList,
  type WeaponItem,
} from "@/components/FilteredWeaponList";

const items: WeaponItem[] = [
  {
    slug: "blackfyre",
    name: "Blackfyre",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
  },
  {
    slug: "heartsbane",
    name: "Heartsbane",
    houseSlug: "tarly",
    region: "reach",
    regionLabel: "The Reach",
  },
  {
    slug: "ice",
    name: "Ice",
    houseSlug: "stark",
    region: "north",
    regionLabel: "The North",
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FilteredWeaponList", () => {
  it("renders every weapon by default", () => {
    render(<FilteredWeaponList items={items} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });

  it("exposes a labelled search input", () => {
    render(<FilteredWeaponList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search weapons/i }),
    ).toBeDefined();
  });

  it("filters after the 300ms debounce", () => {
    render(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ice" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Ice");
  });

  it("renders the empty state when nothing matches", () => {
    render(<FilteredWeaponList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no weapons match/i)).toBeDefined();
  });

  it("applies the region-tinted class to each card", () => {
    const { container } = render(<FilteredWeaponList items={items} />);
    expect(container.querySelector(".cardNorth")).not.toBeNull();
    expect(container.querySelector(".cardReach")).not.toBeNull();
    expect(container.querySelector(".cardCrownlands")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/FilteredWeaponList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `FilteredWeaponList`**

Create `components/FilteredWeaponList.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredWeaponList.module.scss";

export type WeaponItem = {
  slug: string;
  name: string;
  houseSlug: string | null;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: WeaponItem[];
};

const REGION_CARD_CLASS: Record<string, string | undefined> = {
  north: styles.cardNorth,
  vale: styles.cardVale,
  riverlands: styles.cardRiverlands,
  westerlands: styles.cardWesterlands,
  reach: styles.cardReach,
  stormlands: styles.cardStormlands,
  dorne: styles.cardDorne,
  "iron-islands": styles.cardIronIslands,
  crownlands: styles.cardCrownlands,
};

export function FilteredWeaponList({ items }: Props) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const filtered = filterByName(items, debounced);

  return (
    <>
      <div className={listSearch.row}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search weapons…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search weapons"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No weapons match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => {
            const regionClass = item.region
              ? REGION_CARD_CLASS[item.region]
              : undefined;
            const cardClass = cx(styles.card, regionClass);
            return (
              <li key={item.slug} className={styles.item}>
                <Link href={`/weapons/${item.slug}/`} className={cardClass}>
                  <Sigil
                    slug={item.houseSlug}
                    name={item.name}
                    region={item.region}
                    size="6rem"
                    decorative
                  />
                  <span className={styles.name}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
```

Create `components/FilteredWeaponList.module.scss` as a copy of `components/FilteredHouseList.module.scss` minus the list-view (`.listView`, `.region`) rules — weapons don't have a view toggle. Keep all `.cardNorth` … `.cardCrownlands` rules.

- [ ] **Step 4: Run the test**

Run: `bun run test components/FilteredWeaponList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create the index page**

Create `app/weapons/page.tsx`:

```tsx
import type { Metadata } from "next";
import { loadAllWeapons, loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import {
  FilteredWeaponList,
  type WeaponItem,
} from "@/components/FilteredWeaponList";

export const metadata: Metadata = {
  title: "Weapons · Atlas of the Known World",
  description: "Named blades, ancestral arms, and lost relics of the realm.",
};

export default async function WeaponsPage() {
  const [weapons, houses] = await Promise.all([
    loadAllWeapons(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));
  const visible = weapons.filter((w) => !w.frontmatter.draft);

  const items: WeaponItem[] = visible
    .map((w): WeaponItem => {
      const houseSlug =
        w.frontmatter["current-house"] ?? w.frontmatter["origin-house"] ?? null;
      const region = houseSlug ? regionForHouse(houseSlug, housesBySlug) : null;
      return {
        slug: w.frontmatter.slug,
        name: w.frontmatter.name,
        houseSlug,
        region,
        regionLabel: region ? regionLabel(region) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>Weapons</h1>
      <p className="subtitle">
        Named blades, ancestral arms, and lost relics of the realm.
      </p>
      <FilteredWeaponList items={items} />
    </ParchmentLayout>
  );
}
```

Do not create `app/weapons/page.module.scss` — the index page needs no page-local CSS (`ParchmentLayout` + `FilteredWeaponList`'s own module cover the layout). The file is omitted from the file map at the top of the plan for the same reason.

- [ ] **Step 6: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/FilteredWeaponList.tsx components/FilteredWeaponList.module.scss \
        components/FilteredWeaponList.test.tsx app/weapons/page.tsx
git commit -m "$(cat <<'EOF'
TKW: add `FilteredWeaponList` and `/weapons/` index route

- debounced A–Z list mirroring `FilteredHouseList` (no view toggle)
- card region tint resolves through `current-house` → `origin-house` → none
- index page sorts seeded weapons alphabetically
EOF
)"
```

---

### Task 7: Build `FilteredDragonList` + `/dragons/` index route

**Files:**

- Create: `components/FilteredDragonList.tsx`
- Create: `components/FilteredDragonList.module.scss`
- Create: `components/FilteredDragonList.test.tsx`
- Create: `app/dragons/page.tsx`

- [ ] **Step 1: Write the failing list test**

Create `components/FilteredDragonList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  FilteredDragonList,
  type DragonItem,
} from "@/components/FilteredDragonList";

const items: DragonItem[] = [
  {
    slug: "balerion",
    name: "Balerion",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
  },
  {
    slug: "vhagar",
    name: "Vhagar",
    houseSlug: "targaryen",
    region: "crownlands",
    regionLabel: "The Crownlands",
  },
  {
    slug: "cannibal",
    name: "The Cannibal",
    houseSlug: null,
    region: null,
    regionLabel: null,
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("FilteredDragonList", () => {
  it("renders every dragon by default", () => {
    render(<FilteredDragonList items={items} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("exposes a labelled search input", () => {
    render(<FilteredDragonList items={items} />);
    expect(
      screen.getByRole("searchbox", { name: /search dragons/i }),
    ).toBeDefined();
  });

  it("filters after the 300ms debounce", () => {
    render(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cannibal" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Cannibal");
  });

  it("applies the wild card class to dragons with no house", () => {
    const { container } = render(<FilteredDragonList items={items} />);
    expect(container.querySelector(".cardWild")).not.toBeNull();
  });

  it("renders the empty state when nothing matches", () => {
    render(<FilteredDragonList items={items} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(/no dragons match/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/FilteredDragonList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `FilteredDragonList`**

Create `components/FilteredDragonList.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sigil } from "@/components/Sigil";
import { filterByName } from "@/lib/search";
import { cx } from "@/lib/cx";
import listSearch from "@/components/listSearch.module.scss";
import styles from "@/components/FilteredDragonList.module.scss";

export type DragonItem = {
  slug: string;
  name: string;
  houseSlug: string | null;
  region: string | null;
  regionLabel: string | null;
};

type Props = {
  items: DragonItem[];
};

const REGION_CARD_CLASS: Record<string, string | undefined> = {
  north: styles.cardNorth,
  vale: styles.cardVale,
  riverlands: styles.cardRiverlands,
  westerlands: styles.cardWesterlands,
  reach: styles.cardReach,
  stormlands: styles.cardStormlands,
  dorne: styles.cardDorne,
  "iron-islands": styles.cardIronIslands,
  crownlands: styles.cardCrownlands,
};

export function FilteredDragonList({ items }: Props) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const filtered = filterByName(items, debounced);

  return (
    <>
      <div className={listSearch.row}>
        <input
          type="search"
          className={listSearch.input}
          placeholder="Search dragons…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search dragons"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={listSearch.empty}>
          No dragons match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => {
            const regionClass = item.region
              ? REGION_CARD_CLASS[item.region]
              : styles.cardWild;
            const cardClass = cx(styles.card, regionClass);
            return (
              <li key={item.slug} className={styles.item}>
                <Link href={`/dragons/${item.slug}/`} className={cardClass}>
                  {item.houseSlug ? (
                    <Sigil
                      slug={item.houseSlug}
                      name={item.name}
                      region={item.region}
                      size="6rem"
                      decorative
                    />
                  ) : (
                    <span className={styles.wildBadge} aria-hidden="true">
                      Wild
                    </span>
                  )}
                  <span className={styles.name}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
```

Create `components/FilteredDragonList.module.scss` as a copy of `components/FilteredWeaponList.module.scss`. Add at the end:

```css
.cardWild {
  border-color: var(--ink-faded);
}

.wildBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
  font-family: var(--font-heading);
  font-variant: small-caps;
  letter-spacing: 2px;
  color: var(--ink-faded);
  border: 1px dashed rgba(107, 68, 35, 0.35);
  border-radius: 50%;
}
```

- [ ] **Step 4: Run the test**

Run: `bun run test components/FilteredDragonList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create the index page**

Create `app/dragons/page.tsx`:

```tsx
import type { Metadata } from "next";
import { loadAllDragons, loadAllHouses } from "@/lib/content";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import {
  FilteredDragonList,
  type DragonItem,
} from "@/components/FilteredDragonList";

export const metadata: Metadata = {
  title: "Dragons · Atlas of the Known World",
  description: "Of the dragons that were and the dragons that are.",
};

export default async function DragonsPage() {
  const [dragons, houses] = await Promise.all([
    loadAllDragons(),
    loadAllHouses(),
  ]);
  const housesBySlug = new Map(houses.map((h) => [h.slug, h.frontmatter]));
  const visible = dragons.filter((d) => !d.frontmatter.draft);

  const items: DragonItem[] = visible
    .map((d): DragonItem => {
      const houseSlug = d.frontmatter.house;
      const region = houseSlug ? regionForHouse(houseSlug, housesBySlug) : null;
      return {
        slug: d.frontmatter.slug,
        name: d.frontmatter.name,
        houseSlug,
        region,
        regionLabel: region ? regionLabel(region) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ParchmentLayout>
      <h1>Dragons</h1>
      <p className="subtitle">
        Of the dragons that were and the dragons that are.
      </p>
      <FilteredDragonList items={items} />
    </ParchmentLayout>
  );
}
```

- [ ] **Step 6: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/FilteredDragonList.tsx components/FilteredDragonList.module.scss \
        components/FilteredDragonList.test.tsx app/dragons/page.tsx
git commit -m "$(cat <<'EOF'
TKW: add `FilteredDragonList` and `/dragons/` index route

- debounced A–Z list; cards tint by house region, wild dragons get a dashed badge
- card region resolves through `house` slug; `null` => `.cardWild`
- index page sorts seeded dragons alphabetically
EOF
)"
```

---

### Task 8: Wire weapons + dragons into `MainMenu` (5 tiles) and `SiteMenu`

**Files:**

- Modify: `components/MainMenu.tsx`
- Modify: `components/MainMenu.module.scss`
- Modify: `components/MainMenu.test.tsx`
- Modify: `components/SiteMenu.tsx`
- Modify: `components/SiteMenu.test.tsx`

- [ ] **Step 1: Update the MainMenu test**

Replace `components/MainMenu.test.tsx` contents:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenu } from "@/components/MainMenu";

describe("MainMenu", () => {
  it("renders five tiles in order: Maps, Timeline, Houses, Weapons, Dragons", () => {
    render(<MainMenu />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);

    expect(links[0].textContent).toContain("Maps");
    expect(links[0].getAttribute("href")).toBe("/maps/");

    expect(links[1].textContent).toContain("Timeline");
    expect(links[1].getAttribute("href")).toBe("/timeline/");

    expect(links[2].textContent).toContain("Houses");
    expect(links[2].getAttribute("href")).toBe("/houses/");

    expect(links[3].textContent).toContain("Weapons");
    expect(links[3].getAttribute("href")).toBe("/weapons/");

    expect(links[4].textContent).toContain("Dragons");
    expect(links[4].getAttribute("href")).toBe("/dragons/");
  });

  it("marks Maps and Timeline as coming soon", () => {
    render(<MainMenu />);
    const pills = screen.getAllByText(/coming soon/i);
    expect(pills).toHaveLength(2);
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    expect(
      screen.getByRole("navigation", { name: /atlas sections/i }),
    ).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/MainMenu.test.tsx`
Expected: FAIL — only 3 tiles render.

- [ ] **Step 3: Add `SWORD` and `DRAGON` glyphs + two tiles**

In `components/MainMenu.tsx`, after the existing `SIGIL` const, add:

```tsx
const SWORD = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <circle cx="16" cy="5" r="1.7" fill="currentColor" opacity="0.6" />
    <path
      d="M16 7 V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9 10 H23"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13 11 L16 28 L19 11 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14 14 H18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </svg>
);

const DRAGON = (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
    <path
      d="M6 22 Q4 16 8 12 Q14 14 16 18 Q18 14 24 12 Q28 16 26 22 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M16 18 V26 M14 26 H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
  </svg>
);
```

Below the existing Houses tile, append:

```tsx
      <MainMenuTile
        title="Weapons"
        subtitle="Lift the blades of legend."
        glyph={SWORD}
        href="/weapons/"
      />
      <MainMenuTile
        title="Dragons"
        subtitle="Wake the dragon."
        glyph={DRAGON}
        href="/dragons/"
      />
```

(The final visual tuning of `SWORD` and `DRAGON` paths can be refined later; these paths are functional starting points.)

- [ ] **Step 4: Rework `MainMenu.module.scss` for 5 tiles via `grid-template-areas`**

Replace `components/MainMenu.module.scss` contents:

```css
.menu {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-areas:
    "maps    maps    timeline timeline houses  houses"
    ".       weapons weapons  dragons  dragons .";
  gap: 1.5rem;
}

.menu > :nth-child(1) {
  grid-area: maps;
}
.menu > :nth-child(2) {
  grid-area: timeline;
}
.menu > :nth-child(3) {
  grid-area: houses;
}
.menu > :nth-child(4) {
  grid-area: weapons;
}
.menu > :nth-child(5) {
  grid-area: dragons;
}

@media (max-width: 1023.98px) {
  /* lg */
  .menu {
    grid-template-columns: repeat(2, 1fr);
    grid-template-areas:
      "maps     timeline"
      "houses   weapons"
      "dragons  dragons";
  }
}

@media (max-width: 767.98px) {
  /* md */
  .menu {
    grid-template-columns: 1fr;
    grid-template-areas:
      "maps"
      "timeline"
      "houses"
      "weapons"
      "dragons";
  }
}
```

Notes:

- `.menu > :nth-child(N)` assigns `grid-area` by source order. This avoids reaching across module boundaries (each `MainMenuTile` doesn't know its own area name) and stays within `MainMenu.module.scss`.
- Per `CLAUDE.md`, no `grid-column: 1 / -1` — every layout is named-area driven.

- [ ] **Step 5: Run the MainMenu test**

Run: `bun run test components/MainMenu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Update the SiteMenu and its test**

In `components/SiteMenu.tsx`, expand `ITEMS`:

```ts
const ITEMS = [
  { href: "/maps/", label: "Maps" },
  { href: "/timeline/", label: "Timeline" },
  { href: "/houses/", label: "Houses" },
  { href: "/characters/", label: "Characters" },
  { href: "/weapons/", label: "Weapons" },
  { href: "/dragons/", label: "Dragons" },
] as const;
```

In `components/SiteMenu.test.tsx`, update the `'reveals the primary nav ...'` test to expect six links:

```ts
  it('reveals the primary nav with Maps, Timeline, Houses, Characters, Weapons, Dragons when opened', () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeDefined();

    const links = screen.getAllByRole('link');
    const navLinks = links.filter((l) =>
      ['/maps/', '/timeline/', '/houses/', '/characters/', '/weapons/', '/dragons/'].includes(
        l.getAttribute('href') ?? '',
      ),
    );
    expect(navLinks).toHaveLength(6);
    expect(navLinks.map((l) => l.textContent?.trim())).toEqual([
      'Maps',
      'Timeline',
      'Houses',
      'Characters',
      'Weapons',
      'Dragons',
    ]);
  });
```

- [ ] **Step 7: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/MainMenu.tsx components/MainMenu.module.scss components/MainMenu.test.tsx \
        components/SiteMenu.tsx components/SiteMenu.test.tsx
git commit -m "$(cat <<'EOF'
TKW: wire weapons + dragons into `MainMenu` (5 tiles) and `SiteMenu`

- `MainMenu` grows to 5 tiles; `grid-template-areas` keeps the 3+2 centred layout
- `SWORD` + `DRAGON` glyphs match the existing `COMPASS` / `HOURGLASS` / `SIGIL` style
- `SiteMenu` appends `Weapons` and `Dragons` after `Characters`
EOF
)"
```

---

### Task 9: Extend `prose-links` to weapon + dragon kinds

**Files:**

- Modify: `lib/prose-links.ts`
- Modify: `lib/prose-links.test.ts`
- Modify: `app/houses/[slug]/page.tsx`
- Modify: `app/characters/[slug]/page.tsx`
- Modify: `app/weapons/[slug]/page.tsx`
- Modify: `app/dragons/[slug]/page.tsx`

- [ ] **Step 1: Write failing test cases for weapon/dragon kinds**

In `lib/prose-links.test.ts`, locate the helper at the top of the file (the one that builds a default `args` shape for `buildProseLinkIndex`). Extend it to accept (and pass through) `allWeapons` and `allDragons` defaulting to `[]`. Then add new test blocks:

```ts
import { buildProseLinkIndex, type ProseLinkIndex } from "@/lib/prose-links";
import type { Weapon, Dragon } from "@/lib/schemas";

// ... existing helpers ...

const weaponBase: Weapon = {
  slug: "blackfyre",
  name: "Blackfyre",
  type: "sword",
  material: "valyrian-steel",
  status: "lost",
  "origin-house": "targaryen",
  "current-house": null,
  wielders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

const dragonBase: Dragon = {
  slug: "vhagar",
  name: "Vhagar",
  hatched: null,
  died: null,
  status: "dead",
  house: "targaryen",
  riders: [],
  aliases: [],
  mentions: [],
  sources: [],
  draft: false,
};

describe("buildProseLinkIndex (weapons and dragons)", () => {
  it("emits weapon targets with `/weapons/<slug>/` hrefs", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [{ slug: "blackfyre", frontmatter: weaponBase }],
      allDragons: [],
      current: { kind: "house", slug: "targaryen", mentions: [] },
    });
    const target = out.targets.find((t) => t.slug === "blackfyre");
    expect(target?.href).toBe("/weapons/blackfyre/");
    expect(target?.kind).toBe("weapon");
  });

  it("emits dragon targets with `/dragons/<slug>/` hrefs", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [],
      allDragons: [{ slug: "vhagar", frontmatter: dragonBase }],
      current: { kind: "house", slug: "targaryen", mentions: [] },
    });
    const target = out.targets.find((t) => t.slug === "vhagar");
    expect(target?.href).toBe("/dragons/vhagar/");
    expect(target?.kind).toBe("dragon");
  });

  it("does not link a weapon to itself when current.kind=weapon", () => {
    const out = buildProseLinkIndex({
      allCharacters: [],
      allHouses: [],
      allWeapons: [{ slug: "blackfyre", frontmatter: weaponBase }],
      allDragons: [],
      current: { kind: "weapon", slug: "blackfyre", mentions: [] },
    });
    expect(out.selfSlug).toBe("blackfyre");
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `bun run test lib/prose-links.test.ts`
Expected: FAIL — `allWeapons` / `allDragons` not accepted; new kinds not supported.

- [ ] **Step 3: Extend `prose-links.ts`**

In `lib/prose-links.ts`:

Change the `ProseLinkTarget['kind']` union:

```ts
export type ProseLinkTarget = {
  slug: string;
  kind: "character" | "house" | "weapon" | "dragon";
  href: string;
  surfaceForms: string[];
};
```

Update the import to include weapon/dragon types:

```ts
import type { Character, House, Weapon, Dragon } from "@/lib/schemas";
```

Change the `buildProseLinkIndex` signature and body:

```ts
export function buildProseLinkIndex(args: {
  allCharacters: ReadonlyArray<{ slug: string; frontmatter: Character }>;
  allHouses: ReadonlyArray<{ slug: string; frontmatter: House }>;
  allWeapons: ReadonlyArray<{ slug: string; frontmatter: Weapon }>;
  allDragons: ReadonlyArray<{ slug: string; frontmatter: Dragon }>;
  current: {
    kind: "character" | "house" | "weapon" | "dragon";
    slug: string;
    mentions: readonly string[];
  };
}): ProseLinkIndex {
  const { allCharacters, allHouses, allWeapons, allDragons, current } = args;
  const mentioned = new Set(current.mentions);
  const targets: ProseLinkTarget[] = [];

  // ... existing character loop ...
  // ... existing house loop ...

  for (const w of allWeapons) {
    const fm = w.frontmatter;
    if (fm.draft) continue;
    const surfaceForms = uniqueOrdered([fm.name, ...fm.aliases]);
    if (surfaceForms.length === 0) continue;
    targets.push({
      slug: fm.slug,
      kind: "weapon",
      href: `/weapons/${fm.slug}/`,
      surfaceForms,
    });
  }

  for (const d of allDragons) {
    const fm = d.frontmatter;
    if (fm.draft) continue;
    const surfaceForms = uniqueOrdered([fm.name, ...fm.aliases]);
    if (surfaceForms.length === 0) continue;
    targets.push({
      slug: fm.slug,
      kind: "dragon",
      href: `/dragons/${fm.slug}/`,
      surfaceForms,
    });
  }

  return { targets, selfSlug: current.slug };
}
```

(Keep the existing `character` and `house` loops unchanged — just add the two new loops above the final `return`.)

- [ ] **Step 4: Run the prose-links tests**

Run: `bun run test lib/prose-links.test.ts`
Expected: PASS.

- [ ] **Step 5: Update all four callsites to pass `allWeapons` + `allDragons`**

For each of the four pages below, do these three changes:

1. Add `loadAllWeapons` and `loadAllDragons` to the existing `from '@/lib/content'` import.
2. Add `loadAllWeapons()` and `loadAllDragons()` to the `Promise.all` that loads page data.
3. Pass `allWeapons` and `allDragons` into the `buildProseLinkIndex({ ... })` call.

**`app/houses/[slug]/page.tsx`** — extend the `Promise.all` and pass the new args:

```tsx
const [house, allHouses, castles, characters, allWeapons, allDragons] =
  await Promise.all([
    loadHouse(slug).catch(() => null),
    loadAllHouses(),
    loadAllCastles(),
    loadAllCharacters(),
    loadAllWeapons(),
    loadAllDragons(),
  ]);
// ...
const proseLinks = buildProseLinkIndex({
  allCharacters: characters.map((c) => ({
    slug: c.slug,
    frontmatter: c.frontmatter,
  })),
  allHouses: allHouses.map((h) => ({
    slug: h.slug,
    frontmatter: h.frontmatter,
  })),
  allWeapons: allWeapons.map((w) => ({
    slug: w.slug,
    frontmatter: w.frontmatter,
  })),
  allDragons: allDragons.map((d) => ({
    slug: d.slug,
    frontmatter: d.frontmatter,
  })),
  current: { kind: "house", slug, mentions: house.frontmatter.mentions },
});
```

**`app/characters/[slug]/page.tsx`** — same pattern. The current code uses two `Promise.all`s; add weapons/dragons to the second one (which loads characters + houses), or split into a third call:

```tsx
const [allCharacters, allHouses, allWeapons, allDragons, portrait] =
  await Promise.all([
    loadAllCharacters(),
    loadAllHouses(),
    loadAllWeapons(),
    loadAllDragons(),
    findPortrait(slug, fm.sex),
  ]);
// ...
const proseLinks = buildProseLinkIndex({
  allCharacters: allCharacters.map((c) => ({
    slug: c.slug,
    frontmatter: c.frontmatter,
  })),
  allHouses: allHouses.map((h) => ({
    slug: h.slug,
    frontmatter: h.frontmatter,
  })),
  allWeapons: allWeapons.map((w) => ({
    slug: w.slug,
    frontmatter: w.frontmatter,
  })),
  allDragons: allDragons.map((d) => ({
    slug: d.slug,
    frontmatter: d.frontmatter,
  })),
  current: { kind: "character", slug, mentions: fm.mentions },
});
```

**`app/weapons/[slug]/page.tsx`** — currently calls `renderMarkdown(weapon.body)` with no prose links. Add:

```tsx
import { buildProseLinkIndex } from "@/lib/prose-links";
// ...
const [weapon, allHouses, allCharacters, allWeapons, allDragons] =
  await Promise.all([
    loadWeapon(slug).catch(() => null),
    loadAllHouses(),
    loadAllCharacters(),
    loadAllWeapons(),
    loadAllDragons(),
  ]);
if (!weapon) notFound();
// ...
const proseLinks = buildProseLinkIndex({
  allCharacters: allCharacters.map((c) => ({
    slug: c.slug,
    frontmatter: c.frontmatter,
  })),
  allHouses: allHouses.map((h) => ({
    slug: h.slug,
    frontmatter: h.frontmatter,
  })),
  allWeapons: allWeapons.map((w) => ({
    slug: w.slug,
    frontmatter: w.frontmatter,
  })),
  allDragons: allDragons.map((d) => ({
    slug: d.slug,
    frontmatter: d.frontmatter,
  })),
  current: { kind: "weapon", slug, mentions: weapon.frontmatter.mentions },
});
const html =
  fm && weapon.body.trim()
    ? await renderMarkdown(weapon.body, { proseLinks })
    : "";
```

**`app/dragons/[slug]/page.tsx`** — same as weapons but with `loadDragon` / `kind: 'dragon'`.

- [ ] **Step 6: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/prose-links.ts lib/prose-links.test.ts \
        'app/houses/[slug]/page.tsx' 'app/characters/[slug]/page.tsx' \
        'app/weapons/[slug]/page.tsx' 'app/dragons/[slug]/page.tsx'
git commit -m "$(cat <<'EOF'
TKW: extend `prose-links` to weapon + dragon kinds

- `ProseLinkTarget['kind']` adds `weapon` and `dragon`
- `buildProseLinkIndex` ingests `allWeapons` + `allDragons`
- all four detail-page callsites pass the new collections through
EOF
)"
```

---

### Task 10: Resolve weapons in `HouseInfobox`; add Dragons row; surface "Bore" / "Rode" on character pages

**Files:**

- Modify: `components/HouseInfobox.tsx`
- Modify: `components/HouseInfobox.test.tsx`
- Modify: `app/houses/[slug]/page.tsx`
- Modify: `app/characters/[slug]/page.tsx`
- Modify: `app/characters/[slug]/page.module.scss` (only if a new section needs styling)

- [ ] **Step 1: Update the existing HouseInfobox test for slug-resolved weapons + new Dragons row**

In `components/HouseInfobox.test.tsx`, locate any test that asserts the "Ancestral weapons" row. Update it (or add a new test) to pass a `weaponsBySlug` map and assert the row resolves slug → name + link. Also add a test for the new "Dragons" row driven by a `dragonsForHouse` prop. **Read the existing test file first to determine exact structure** before editing — the test file follows the conventions in `components/FilteredHouseList.test.tsx` (real fixtures, no mocks).

Example additions:

```ts
import type { Weapon, Dragon } from '@/lib/schemas';

// ... existing fixtures ...

const blackfyre: Weapon = {
  slug: 'blackfyre', name: 'Blackfyre',
  type: 'sword', material: 'valyrian-steel', status: 'lost',
  'origin-house': 'targaryen', 'current-house': null,
  wielders: [], aliases: [], mentions: [], sources: [], draft: false,
};

const balerion: Dragon = {
  slug: 'balerion', name: 'Balerion',
  hatched: null, died: null, status: 'dead', house: 'targaryen',
  riders: [], aliases: [], mentions: [], sources: [], draft: false,
};

it('links each ancestral weapon to /weapons/<slug>/ when present in the map', () => {
  const targaryenWithWeapon: House = {
    ...targaryen,
    'ancestral-weapons': ['blackfyre'],
  };
  render(
    <HouseInfobox
      house={targaryenWithWeapon}
      castlesBySlug={castlesBySlug}
      charactersBySlug={charactersBySlug}
      housesBySlug={housesBySlug}
      weaponsBySlug={new Map([['blackfyre', blackfyre]])}
      dragonsForHouse={[]}
    />,
  );
  const link = screen.getByRole('link', { name: /blackfyre/i });
  expect(link.getAttribute('href')).toBe('/weapons/blackfyre/');
});

it('falls back to a humanized slug when the weapon is not yet seeded', () => {
  const targaryenWithWeapon: House = {
    ...targaryen,
    'ancestral-weapons': ['dark-sister'],
  };
  render(
    <HouseInfobox
      house={targaryenWithWeapon}
      castlesBySlug={castlesBySlug}
      charactersBySlug={charactersBySlug}
      housesBySlug={housesBySlug}
      weaponsBySlug={new Map()}
      dragonsForHouse={[]}
    />,
  );
  expect(screen.getByText('Dark Sister')).toBeDefined();
  expect(screen.queryByRole('link', { name: /dark sister/i })).toBeNull();
});

it('renders a Dragons row listing every dragon whose `house` matches', () => {
  render(
    <HouseInfobox
      house={targaryen}
      castlesBySlug={castlesBySlug}
      charactersBySlug={charactersBySlug}
      housesBySlug={housesBySlug}
      weaponsBySlug={new Map()}
      dragonsForHouse={[balerion]}
    />,
  );
  expect(screen.getByText('Dragons')).toBeDefined();
  const link = screen.getByRole('link', { name: /balerion/i });
  expect(link.getAttribute('href')).toBe('/dragons/balerion/');
});
```

- [ ] **Step 2: Run the failing test**

Run: `bun run test components/HouseInfobox.test.tsx`
Expected: FAIL — props `weaponsBySlug` and `dragonsForHouse` don't exist on `HouseInfobox`.

- [ ] **Step 3: Update `HouseInfobox` to accept and use the new props**

In `components/HouseInfobox.tsx`:

Add to the `Props` type:

```ts
type Props = {
  house: House;
  castlesBySlug: Map<string, Castle>;
  charactersBySlug: Map<string, Character>;
  housesBySlug: Map<string, House>;
  weaponsBySlug: Map<string, Weapon>;
  dragonsForHouse: Dragon[];
  className?: string;
};
```

Update the import:

```ts
import type {
  House,
  Castle,
  Character,
  HouseInfoEntry,
  Weapon,
  Dragon,
} from "@/lib/schemas";
```

Inside the component, replace the interim `weapons` derivation with:

```ts
const weapons: HouseInfoEntry[] = (house["ancestral-weapons"] ?? []).map(
  (slug) => ({
    slug,
    name: weaponsBySlug.get(slug)?.name ?? humanizeSlug(slug),
  }),
);

const dragons: HouseInfoEntry[] = dragonsForHouse.map((d) => ({
  slug: d.slug,
  name: d.name,
}));
```

Change the existing `<InfoRow label="Ancestral weapons" entries={weapons} />` to:

```tsx
<InfoRow
  label="Ancestral weapons"
  entries={weapons}
  hrefPrefix="/weapons"
  exists={(s) => weaponsBySlug.has(s)}
/>
```

Add a Dragons row immediately after the Ancestral weapons row:

```tsx
<InfoRow
  label="Dragons"
  entries={dragons}
  hrefPrefix="/dragons"
  exists={(s) => dragonsForHouse.some((d) => d.slug === s)}
/>
```

- [ ] **Step 4: Update the `app/houses/[slug]/page.tsx` callsite to pass the new props**

The page already loads `allWeapons` + `allDragons` (from Task 9). Build the maps and pass them:

```tsx
const weaponsBySlug = new Map(allWeapons.map((w) => [w.slug, w.frontmatter]));
const dragonsForHouse = allDragons
  .map((d) => d.frontmatter)
  .filter((d) => d.house === slug && !d.draft);

// ...
<HouseInfobox
  house={house.frontmatter}
  castlesBySlug={castlesBySlug}
  charactersBySlug={charactersBySlug}
  housesBySlug={housesBySlug}
  weaponsBySlug={weaponsBySlug}
  dragonsForHouse={dragonsForHouse}
  className={styles.infobox}
/>;
```

- [ ] **Step 5: Run the infobox tests**

Run: `bun run test components/HouseInfobox.test.tsx`
Expected: PASS.

- [ ] **Step 6: Add "Bore" and "Rode" sections to character pages**

In `app/characters/[slug]/page.tsx`, after the existing `hasFamily` derivation, add:

```tsx
const bornBy = allWeapons
  .map((w) => w.frontmatter)
  .filter((w) => !w.draft && w.wielders.includes(slug));

const ridden = allDragons
  .map((d) => d.frontmatter)
  .filter((d) => !d.draft && d.riders.includes(slug));
```

In the JSX, immediately after the existing `Family` section (and before the `back` link), add:

```tsx
{
  bornBy.length > 0 && (
    <section aria-labelledby="bore-heading">
      <h2 id="bore-heading">Bore</h2>
      <ul className={styles.crossList}>
        {bornBy.map((w) => (
          <li key={w.slug}>
            <Link href={`/weapons/${w.slug}/`}>{w.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

{
  ridden.length > 0 && (
    <section aria-labelledby="rode-heading">
      <h2 id="rode-heading">Rode</h2>
      <ul className={styles.crossList}>
        {ridden.map((d) => (
          <li key={d.slug}>
            <Link href={`/dragons/${d.slug}/`}>{d.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

In `app/characters/[slug]/page.module.scss`, append:

```css
.crossList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.25rem;
}
```

- [ ] **Step 7: Run system check**

Run: `bun run system-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/HouseInfobox.tsx components/HouseInfobox.test.tsx \
        'app/houses/[slug]/page.tsx' \
        'app/characters/[slug]/page.tsx' 'app/characters/[slug]/page.module.scss'
git commit -m "$(cat <<'EOF'
TKW: cross-link weapons + dragons from house and character detail pages

- `HouseInfobox` resolves ancestral-weapon slugs to `/weapons/<slug>/` links
- `HouseInfobox` gains a Dragons row driven by `dragonsForHouse`
- character pages surface "Bore" (wielders match) and "Rode" (riders match) sections
EOF
)"
```

---

### Task 11: Seed weapon content + migrate `stark.md` and `tarly.md`

**Files:**

- Create: `content/weapons/blackfyre.md`
- Create: `content/weapons/dark-sister.md`
- Create: `content/weapons/heartsbane.md`
- Create: `content/weapons/ice.md`
- Modify: `content/houses/stark.md`
- Modify: `content/houses/tarly.md`
- Modify: `lib/content.test.ts`

- [ ] **Step 1: Seed the four weapon files**

Use AWOIAF as the canonical reference for every value. Keep prose to two or three paragraphs; the `gota-populate-character` and `gota-populate-house` skills set the tone. Each file should:

- Match the `WeaponSchema` exactly (every required field present, enums spelled correctly).
- Use canonical character slugs where available (e.g. `eddard-stark`, `aegon-i-targaryen`). If a wielder character has no markdown entry yet, still reference their slug — `HouseInfobox` and `WeaponInfobox` fall back to humanized slug names.
- Include `mentions:` entries for any house or character whose first-name / bare-house form should auto-link in the prose body.
- Include at least one `sources:` entry pointing to AWOIAF.

`content/weapons/blackfyre.md`:

```markdown
---
slug: blackfyre
name: Blackfyre
type: sword
material: valyrian-steel
status: lost
origin-house: targaryen
current-house: null
wielders:
  - aegon-i-targaryen
  - daemon-i-blackfyre
  - aegor-rivers
aliases: []
mentions:
  - targaryen
  - blackfyre
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Blackfyre
    license: CC-BY-SA-3.0
draft: false
---

Blackfyre is the ancestral Valyrian-steel sword of House Targaryen, borne by Aegon the Conqueror through the wars of the Conquest and passed from king to king for one hundred and eighty-four years. It is the larger of the two Valyrian blades the Targaryens carried out of the Doom — paired with Dark Sister, the slimmer woman's blade once wielded by Queen Visenya.

On his deathbed in 184 AC, King Aegon IV legitimised his bastards and gave Blackfyre to the eldest of them, Daemon Waters, who took the sword for his name and rose against his trueborn half-brother. Twelve years later Daemon I crowned himself, and the First Blackfyre Rebellion ended on the Redgrass Field beneath the arrows of Brynden Rivers. The sword was carried from the field by Aegor Rivers — Bittersteel — who took it across the Narrow Sea with Daemon's surviving sons and the Golden Company.

The blade has not been seen in Westeros since.
```

`content/weapons/dark-sister.md`:

```markdown
---
slug: dark-sister
name: Dark Sister
type: sword
material: valyrian-steel
status: lost
origin-house: targaryen
current-house: null
wielders:
  - visenya-targaryen
  - brynden-rivers
aliases: []
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Dark_Sister
    license: CC-BY-SA-3.0
draft: false
---

Dark Sister is a slender Valyrian-steel blade, forged for a woman's hand, that House Targaryen carried out of the Doom alongside its larger companion Blackfyre. Queen Visenya, who flew Vhagar in the Conquest and trained with the sword in her father's hall, wielded it through the years of conquest and the long century after.

After Visenya the blade passed to a succession of Targaryen princes and bastards. It was last carried by Brynden Rivers — Bloodraven — Hand of the King under Aerys I and the bastard half-brother who slew Daemon I Blackfyre on the Redgrass Field. When Bloodraven was sent to the Wall in 233 AC for the murder of Aenys Blackfyre at Whitewalls, he took the sword with him; he is said to have ranged beyond the Wall and never returned, and Dark Sister vanished with him.
```

`content/weapons/heartsbane.md`:

```markdown
---
slug: heartsbane
name: Heartsbane
type: greatsword
material: valyrian-steel
status: extant
origin-house: tarly
current-house: tarly
wielders: []
aliases: []
mentions:
  - tarly
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Heartsbane
    license: CC-BY-SA-3.0
draft: false
---

Heartsbane is the ancestral Valyrian-steel greatsword of House Tarly of Horn Hill, borne by the Lord of Horn Hill for five hundred years. It is the only Valyrian blade still carried in the Reach.

By the events of _A Game of Thrones_ it hangs at the hip of Lord Randyll Tarly, who is reckoned by many the finest battle commander south of the Neck. His firstborn son Samwell is, by Lord Randyll's measure, too soft to inherit the blade, and the question of who will carry Heartsbane after him is one of the few matters on which the lord of Horn Hill is openly uncertain.
```

`content/weapons/ice.md`:

```markdown
---
slug: ice
name: Ice
type: greatsword
material: valyrian-steel
status: destroyed
origin-house: stark
current-house: null
destroyed:
  year: 299
  era: AC
  precision: year
wielders:
  - rickard-stark
  - eddard-stark
aliases: []
mentions:
  - stark
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Ice
    license: CC-BY-SA-3.0
draft: false
---

Ice was the ancestral Valyrian-steel greatsword of House Stark of Winterfell, borne by the Lords of Winterfell for four hundred years before the Conquest. The blade was so wide that two men could have laid head to head along its length, and Lord Eddard carried it himself to every execution held in the godswood.

After Lord Eddard's death on the steps of Baelor's Sept in 299 AC, his sword was taken to King's Landing and given over to Tywin Lannister, who broke it down and bade his armourers reforge it into two new blades. The smaller, paler sword was given to King Joffrey, who named it Widow's Wail; the larger went, by Tywin's wish, to Jaime, and Jaime in turn gave it to Brienne of Tarth and bade her find Sansa Stark with it. Brienne calls her sword Oathkeeper.

Of the blade Lord Rickard and Lord Eddard carried, nothing remains.
```

- [ ] **Step 2: Migrate `stark.md` and `tarly.md`**

In `content/houses/stark.md`, add the `ancestral-weapons` block to the frontmatter (between `cadet-houses` and `region`):

```yaml
ancestral-weapons:
  - ice
```

In `content/houses/tarly.md`, similarly add:

```yaml
ancestral-weapons:
  - heartsbane
```

- [ ] **Step 3: Add round-trip loader tests**

Append to `lib/content.test.ts`:

```ts
describe("loadWeapon round-trip", () => {
  it("loads Blackfyre with the canonical Valyrian-steel material", async () => {
    const result = await loadWeapon("blackfyre");
    expect(result.frontmatter.slug).toBe("blackfyre");
    expect(result.frontmatter.material).toBe("valyrian-steel");
    expect(result.frontmatter.status).toBe("lost");
  });

  it("lists Eddard among Ice's wielders", async () => {
    const result = await loadWeapon("ice");
    expect(result.frontmatter.wielders).toContain("eddard-stark");
  });
});

describe("loadAllWeapons round-trip", () => {
  it("returns all four seeded weapons", async () => {
    const all = await loadAllWeapons();
    const slugs = all.map((w) => w.frontmatter.slug).sort();
    expect(slugs).toEqual(["blackfyre", "dark-sister", "heartsbane", "ice"]);
  });
});
```

- [ ] **Step 4: Run the test + system check**

Run: `bun run system-check`
Expected: PASS. The new weapons render in `/weapons/`, link from Targaryen/Blackfyre/Stark/Tarly house pages, and Eddard's character page shows a "Bore" section listing Ice.

- [ ] **Step 5: Commit**

```bash
git add content/weapons/blackfyre.md content/weapons/dark-sister.md \
        content/weapons/heartsbane.md content/weapons/ice.md \
        content/houses/stark.md content/houses/tarly.md \
        lib/content.test.ts
git commit -m "$(cat <<'EOF'
TKW: seed `blackfyre`, `dark-sister`, `heartsbane`, `ice`; reference from house frontmatter

- four AWOIAF-sourced weapon entries cover the canonical ancestral blades
- `stark.md` + `tarly.md` add `ancestral-weapons` slug references
- `lib/content.test.ts` gains round-trip coverage for the seeded set
EOF
)"
```

---

### Task 12: Seed dragon content

**Files:**

- Create: `content/dragons/balerion.md`
- Create: `content/dragons/vhagar.md`
- Create: `content/dragons/meraxes.md`
- Create: `content/dragons/caraxes.md`
- Create: `content/dragons/vermithor.md`
- Create: `content/dragons/sunfyre.md`
- Create: `content/dragons/cannibal.md`
- Modify: `lib/content.test.ts`

- [ ] **Step 1: Seed the seven dragon files**

Same authoring discipline as weapons (Step 1 of Task 11): AWOIAF as source of truth, exact schema fields, canonical character slugs for `riders`, `mentions` populated so prose first-name forms link.

Skeletal frontmatter shapes — fill out fields from AWOIAF; prose body is 2–3 paragraphs.

`content/dragons/balerion.md`:

```markdown
---
slug: balerion
name: Balerion
color: black, with red eyes and a maw of black flame
size: monstrous
hatched:
  year: -100
  era: BC
  precision: decade
died:
  year: 94
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - aegon-i-targaryen
  - aenys-i-targaryen
  - maegor-i-targaryen
  - viserys-i-targaryen
aliases:
  - The Black Dread
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Balerion
    license: CC-BY-SA-3.0
draft: false
---

Balerion the Black Dread was the greatest of the Targaryen dragons, the last living creature of any kind to have seen Valyria with his own eyes before the Doom. He was already two hundred years old and grown to monstrous size when Aegon the Conqueror rode him out of Dragonstone across the Blackwater, and his fires melted the Iron Throne from the swords of Aegon's defeated enemies.

After Aegon's death Balerion bore Aenys I and Maegor the Cruel, and at the last the boy king Viserys I, whose weight he could scarce feel. By Viserys's reign Balerion had begun to slow, and in 94 AC he died at Dragonstone of old age — the only dragon of the Conquest to do so. His skull, larger than a destrier and black as the dragon himself, was kept in the throne room of the Red Keep until Robert's Rebellion, when it was hidden away.
```

`content/dragons/vhagar.md`:

```markdown
---
slug: vhagar
name: Vhagar
color: bronze and green
size: monstrous
hatched:
  year: -52
  era: BC
  precision: decade
died:
  year: 130
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - visenya-targaryen
  - aemond-targaryen
aliases: []
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Vhagar
    license: CC-BY-SA-3.0
draft: false
---

Vhagar was the mount of Queen Visenya Targaryen through the Conquest, and the bronze-and-green sister to her brother's Balerion. She fought on the Field of Fire with Meraxes, and for sixty years after the wars carried Visenya, the dread of every man who saw her shadow on the ground.

After Visenya's death Vhagar passed to a string of Targaryen princes, growing larger with every passing year. By the time she came to Prince Aemond — claimed by him at Driftmark in the wake of Laena Velaryon's death — Vhagar was the largest dragon living, second in all history only to Balerion. In 130 AC she met Caraxes above the Gods Eye in the great battle of the Dance, and there both dragons fell. Aemond fell with her.
```

`content/dragons/meraxes.md`:

```markdown
---
slug: meraxes
name: Meraxes
color: silver, with golden eyes
size: great
hatched:
  year: -52
  era: BC
  precision: decade
died:
  year: 10
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - rhaenys-targaryen
aliases: []
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Meraxes
    license: CC-BY-SA-3.0
draft: false
---

Meraxes was the silver-scaled, golden-eyed dragon of Queen Rhaenys Targaryen, large enough that a horse could ride down her gullet. She was the third of the three dragons of the Conquest, and on the Field of Fire she and Vhagar burned the host of Mern Gardener and Loren Lannister into a smoking ruin.

After the Conquest Aegon turned his attention to Dorne, the one kingdom he had not subdued. The Dornish refused open battle, melting into the deep desert and trusting to ambush; for years dragons burned Dornish towers to no lasting end. In 10 AC, as Rhaenys assaulted the Hellholt, a scorpion bolt from the castle struck Meraxes through the eye. Dragon and rider fell together from the sky. Neither rose again, and Aegon ended the First Dornish War soon after.
```

`content/dragons/caraxes.md`:

```markdown
---
slug: caraxes
name: Caraxes
color: red
size: great
hatched: null
died:
  year: 130
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - aemon-targaryen-prince-of-dragonstone
  - daemon-targaryen
aliases:
  - The Blood Wyrm
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Caraxes
    license: CC-BY-SA-3.0
draft: false
---

Caraxes the Blood Wyrm was a long, lean, scarlet dragon, ridden first by Prince Aemon Targaryen, the heir of Jaehaerys I, and after Aemon's death by his nephew Prince Daemon. Daemon and Caraxes carved out a brief kingdom for themselves in the Stepstones, where the Blood Wyrm earned his name putting Triarchy fleets to flame.

When the Dance of the Dragons came in 129 AC, Daemon took up the cause of his wife Queen Rhaenyra against Aegon II and his Hightower kin. In 130 AC, above the Gods Eye, Caraxes met the great Vhagar in single combat. Caraxes drove Vhagar from the air; the two dragons fell entwined into the lake below, and Daemon — leaping from the saddle at the last — drove Dark Sister through Aemond's eye as both princes fell. None of the four — princes or dragons — were ever seen alive again.
```

If `aemon-targaryen-prince-of-dragonstone` does not match an existing character file, the infobox renders `Aemon Targaryen Prince Of Dragonstone` as plain (un-linked) text via the slug-humanize fallback. Acceptable for the seed; the slug can be normalised when a character entry is added.

`content/dragons/vermithor.md`:

```markdown
---
slug: vermithor
name: Vermithor
color: bronze, with great tan wings
size: great
hatched: null
died:
  year: 130
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - jaehaerys-i-targaryen
  - hugh-hammer
aliases:
  - The Bronze Fury
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Vermithor
    license: CC-BY-SA-3.0
draft: false
---

Vermithor the Bronze Fury was the dragon of King Jaehaerys I Targaryen, the second largest dragon in the world after Vhagar in the years before the Dance. Jaehaerys rode him for more than half a century, and the great bronze beast knew the touch of the Old King above any other.

After Jaehaerys died Vermithor went riderless and made his lair in the smoking caverns of Dragonmont on Dragonstone. There, in the early days of the Dance, the seed seekers — bastards and smallfolk of suspected Targaryen blood — came to try to claim him. Hugh Hammer, a blacksmith's bastard with hair like beaten gold, was the one Vermithor accepted. Hugh flew him for the blacks until the Second Battle of Tumbleton, where Hugh's treason ended in his own murder and Vermithor was slain by Seasmoke and Tessarion together, after burning the better part of two armies first.
```

`content/dragons/sunfyre.md`:

```markdown
---
slug: sunfyre
name: Sunfyre
color: gold, with pink wing membranes
size: mature
hatched: null
died:
  year: 131
  era: AC
  precision: year
status: dead
house: targaryen
riders:
  - aegon-ii-targaryen
aliases:
  - The Golden
mentions:
  - targaryen
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/Sunfyre
    license: CC-BY-SA-3.0
draft: false
---

Sunfyre the Golden was a mature dragon with scales of beaten gold and pink wing membranes, said in his prime to be the most beautiful dragon ever to fly. He was the mount of King Aegon II Targaryen and the pride of his rider's brief, ruinous reign.

At Rook's Rest in 129 AC, Sunfyre and Aegon ambushed Princess Rhaenys upon Meleys; in the slaughter that followed Meleys was killed, but Sunfyre was broken — a wing twisted, scales seared by Meleys's fire. Aegon was carried half-dead from the field. Sunfyre crawled away to Dragonstone, where he slew the wild dragon Grey Ghost and lingered, growing slowly mad from his wounds. He died not long after Aegon was poisoned in 131 AC, the king and his dragon outliving one another only by the space of a few months.
```

`content/dragons/cannibal.md`:

```markdown
---
slug: cannibal
name: The Cannibal
color: coal-black, with green eyes
size: great
hatched: null
died: null
status: wild
house: null
riders: []
aliases: []
mentions: []
sources:
  - type: awoiaf
    url: https://awoiaf.westeros.org/index.php/The_Cannibal
    license: CC-BY-SA-3.0
draft: false
---

The Cannibal was a great black dragon, never claimed and never ridden, that made his lair in the high caves of Dragonmont long before the Dance of the Dragons. He earned his name by his appetite: smaller dragons, newly hatched dragons, the eggs of dragons in their cradles — all were the Cannibal's prey. The Targaryens left him to his caves.

During the Dance the Cannibal was already old, and the seed seekers who came to Dragonmont avoided his domain by long custom. After the war ended, when the last claimed dragons died and the great dragonpit at King's Landing fell, the Cannibal is said by some maesters to have flown east and never returned. No skull was ever found. His fate is unknown.
```

- [ ] **Step 2: Add round-trip loader tests**

Append to `lib/content.test.ts`:

```ts
describe("loadDragon round-trip", () => {
  it("loads Balerion with monstrous size", async () => {
    const result = await loadDragon("balerion");
    expect(result.frontmatter.slug).toBe("balerion");
    expect(result.frontmatter.size).toBe("monstrous");
  });

  it("parses the Cannibal as a wild dragon (house null, status wild)", async () => {
    const result = await loadDragon("cannibal");
    expect(result.frontmatter.house).toBeNull();
    expect(result.frontmatter.status).toBe("wild");
  });
});

describe("loadAllDragons round-trip", () => {
  it("returns all seven seeded dragons", async () => {
    const all = await loadAllDragons();
    const slugs = all.map((d) => d.frontmatter.slug).sort();
    expect(slugs).toEqual([
      "balerion",
      "cannibal",
      "caraxes",
      "meraxes",
      "sunfyre",
      "vermithor",
      "vhagar",
    ]);
  });
});
```

- [ ] **Step 3: Run system check**

Run: `bun run system-check`
Expected: PASS. `/dragons/` lists all seven entries; the Targaryen house page's Dragons row links to each Targaryen dragon; Visenya / Aemond / Aegon I character pages (when populated) show "Rode" sections.

- [ ] **Step 4: Run the production build to confirm static export**

Run: `bun run build`
Expected: PASS — `out/weapons/index.html`, `out/dragons/index.html`, and `out/weapons/<slug>/index.html` + `out/dragons/<slug>/index.html` are emitted for every seeded entry.

- [ ] **Step 5: Commit**

```bash
git add content/dragons/balerion.md content/dragons/vhagar.md \
        content/dragons/meraxes.md content/dragons/caraxes.md \
        content/dragons/vermithor.md content/dragons/sunfyre.md \
        content/dragons/cannibal.md \
        lib/content.test.ts
git commit -m "$(cat <<'EOF'
TKW: seed seven canonical dragons

- Conquest-era: `balerion`, `vhagar`, `meraxes`
- Dance-era: `caraxes`, `vermithor`, `sunfyre`
- wild: `cannibal` (`house: null`, `status: wild`)
- `lib/content.test.ts` gains round-trip coverage for the seeded set
EOF
)"
```
