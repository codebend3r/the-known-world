# Notable Members exception for House Free Folk

House Free Folk is not a noble lineage. Its house page should not render a Family Tree; it should render a flat **Notable Members** list of figures considered Free Folk.

## Scope

Single house (`freefolk`) for now, but the mechanism is data-driven so any future non-lineage entry (mercenary companies, brotherhoods, etc.) can opt in.

## Schema change

Add to `HouseSchema` in `lib/schemas.ts`:

```ts
"notable-members": z.array(HouseInfoEntrySchema).optional(),
```

`HouseInfoEntrySchema` already provides `{ name, slug?, note? }`, matching the existing `heads` / `titles` / `seats` shape. Reusing it keeps render code and link behavior consistent (auto-link to `/characters/<slug>/` when slug is present).

## Page render

In `app/houses/[slug]/page.tsx`:

- Read `notable-members` off the frontmatter.
- If present and non-empty, render a `<section>` titled "Notable Members" in place of the Family Tree section.
- Otherwise render the existing Family Tree section unchanged.

Markup: `<ul>` of rows, each `<strong>name</strong> — note`. Names with a matching character slug render as `<Link>` to that character page. Styles added to `app/houses/[slug]/page.module.scss` (no new module).

## Content

Populate `notable-members` in `content/houses/freefolk.md`. Single flat list covering:

- Living/recent figures: Mance Rayder, Tormund Giantsbane, Ygritte, Craster, Styr (Magnar of Thenn), Varamyr Sixskins, Mag the Mighty, Harma Dogshead, the Weeper, Lord of Bones (Rattleshirt), Mother Mole, Val, Dalla, Sigorn son of Styr.
- Historical kings (mirrors infobox `heads`): Joramun, Gendel & Gorne, the Horned King, Bael the Bard, Raymun Redbeard.

Notes describe what each is known for (warg, spearwife, Magnar of Thenn, etc.). The `heads` list in the infobox remains unchanged; some overlap with Notable Members is intentional.

## Out of scope

- No grouping/subheadings (one flat list).
- No new character entries; if a `slug:` is set and no character file exists, the entry just renders as plain text.
- No changes to FamilyTree component behavior or to other houses.
