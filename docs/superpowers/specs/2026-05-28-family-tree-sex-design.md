# Family Tree Sex Distinction

## Goal

Family-tree pages should show at a glance whether each named person is male or female. The current tree (`components/FamilyTree.tsx`) renders only name + lifespan + marriage glyph (`⚭`); siblings and spouses are visually indistinguishable.

## Data model

Add a `sex` field to the character schema in `lib/schemas.ts`:

```ts
sex: z.enum(['m', 'f']).nullable().default(null),
```

- `'m'`: male
- `'f'`: female
- `null`: unknown / not applicable (used for `placeholder: true` rows such as `unknown-baratheon-ancestors`)

Nullable + defaulting to `null` so any existing file that has not yet been backfilled still parses. This lets the backfill land in one commit without breaking the build mid-edit.

In each markdown frontmatter, `sex:` is placed immediately after `name:` so the natural reading order is `slug → name → sex → born → died → primary-house → …`.

## Backfill

All ~193 character files in `content/characters/` need `sex` populated.

Strategy:

1. Title-inference for the bulk of files. The first or last entry of the `titles:` array is gendered for most characters:
   - `m`: `King`, `Prince`, `Lord`, `Ser`, `Septon`, `Maester`, `Grand Maester`, `The` (prefix on male epithets), `Lord Commander`, etc.
   - `f`: `Queen`, `Princess`, `Lady`, `Septa`, `The Maid`, `Queen Dowager`, etc.
2. Overrides for known exceptions:
   - `brienne-of-tarth` → `f` (titled `Ser` but female)
   - placeholder rows (`unknown-baratheon-ancestors`, `unknown-mother-of-*`, `unknown-father-of-*`): `mother` → `f`, `father` → `m`, generic unknowns → `null`
   - children and other untitled characters that the title-inference cannot classify get manual `m`/`f` per canon
3. Manual spot-check of the produced output before committing.

The backfill is one-time work performed by the implementer. No script is checked in.

## Rendering

### `lib/family-tree.ts`

Extend the two interfaces:

```ts
export interface TreeSpouse {
  slug: string | null;
  name: string;
  sex: "m" | "f" | null;
  placeholder: boolean;
  inHouse: boolean;
}

export interface TreeNode {
  slug: string;
  name: string;
  sex: "m" | "f" | null;
  // ...existing fields
}
```

Populate `sex` from `person.sex` and `spouse.sex` in `buildFamilyTree`. No other logic changes.

### `components/FamilyTree.tsx`

New small component:

```tsx
function GenderGlyph({ sex }: { sex: "m" | "f" | null }) {
  if (sex === null) return null;
  return (
    <span
      className={`family-tree__gender family-tree__gender--${sex}`}
      aria-label={sex === "m" ? "male" : "female"}
    >
      {sex === "m" ? "♂" : "♀"}
    </span>
  );
}
```

Used:

- Before each `CharacterName` in `PersonLabel`.
- Inside each spouse `span` in `NodeRow`, after the existing `⚭` and before the spouse's `CharacterName`.

When `sex === null`, nothing renders, so placeholders and unknown-sex rows stay visually unchanged.

### `styles/houses.css`

Add one rule alongside the existing `.family-tree__cross`:

```css
.family-tree__gender {
  color: var(--gold-leaf);
  font-size: 0.85rem;
  margin-right: 0.15rem;
}
```

Both genders share the same gold-leaf colour; the symbol shape (`♂` vs `♀`) carries the distinction. This matches the parchment style and avoids adding new colour tokens.

## Testing

- `lib/schemas.test.ts`: extend the existing valid-character fixture to cover `sex: 'm'`, `sex: 'f'`, and `sex: null`. Assert each parses.
- `lib/family-tree.test.ts`: extend fixture characters with `sex` and assert it propagates onto the produced `TreeNode` and `TreeSpouse` entries.
- `components/FamilyTree.test.tsx`: DOM-environment is currently broken in the existing test setup (pre-existing issue, unrelated to this work). Skip component-level assertions here.

## Out of scope

- Recolouring or restyling the rest of the family tree.
- Showing sex on the character detail page or in the character list.
- Filtering characters by sex.
- Recording non-binary or other sex/gender values. Every named ASOIAF character has a canonical male/female; this is a deliberate two-value enum with `null` only for placeholders.

## File checklist

- `lib/schemas.ts`: add `sex` field
- `lib/schemas.test.ts`: extend fixtures
- `lib/family-tree.ts`: plumb `sex` through `TreeNode` / `TreeSpouse`
- `lib/family-tree.test.ts`: extend fixtures, assert propagation
- `components/FamilyTree.tsx`: add `GenderGlyph`, use in `PersonLabel` and `NodeRow`
- `styles/houses.css`: add `.family-tree__gender`
- `content/characters/*.md`: backfill `sex` in all 193 files
