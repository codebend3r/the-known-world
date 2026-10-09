import fs from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  WeaponSchema,
  DragonSchema,
  BattleSchema,
} from "@/lib/schemas";
import { remarkProseLinks, type ProseLinkIndex } from "@/lib/prose-links";
import { memoize, memoizeBySlug } from "@/lib/memoize";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/**
 * Every content type, paired with the schema its frontmatter must satisfy.
 *
 * This is the one list. The `ContentType` union, the frontmatter each type
 * parses into, and the `Collections` shape are all derived from it, so adding
 * a type is a line here and nothing else.
 */
const SCHEMAS = {
  battles: BattleSchema,
  castles: CastleSchema,
  characters: CharacterSchema,
  dragons: DragonSchema,
  events: EventSchema,
  houses: HouseSchema,
  weapons: WeaponSchema,
};

export type ContentType = keyof typeof SCHEMAS;

type Frontmatter = { [K in ContentType]: z.infer<(typeof SCHEMAS)[K]> };

/**
 * The same map, re-annotated. Indexing `SCHEMAS` with a generic key widens
 * `.parse` to a union of all seven return types; this mapped annotation keeps
 * each key tied to its own, so `loadFile` returns the right frontmatter.
 */
const CONTENT_TYPES: {
  [K in ContentType]: { parse: (input: unknown) => Frontmatter[K] };
} = SCHEMAS;

/** Every collection loaded at once, the shape the integrity checks take. */
export type Collections = {
  [K in ContentType]: Array<Loaded<Frontmatter[K]>>;
};

// `output: "export"` renders every page in a worker process, and most pages call
// several `loadAll*`, so without a cache each one re-read and re-validated the
// whole corpus. Enabled only for production builds, where content is immutable:
// `next dev` and tests keep reading from disk so edits show up without a
// restart. Callers must not mutate a returned array, since a hit is shared.
const isEnabled = process.env.NODE_ENV === "production";

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<K extends ContentType>({
  type,
  slug,
}: {
  type: K;
  slug: string;
}): Promise<Loaded<Frontmatter[K]>> {
  const filePath = path.join(CONTENT_ROOT, type, `${slug}.md`);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = parseFrontmatter(raw);
  const frontmatter = CONTENT_TYPES[type].parse(parsed.data);
  return { frontmatter, body: parsed.content, slug };
}

function parseFrontmatter(raw: string): { data: unknown; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error("Markdown file is missing YAML frontmatter");
  return {
    data: parseYaml(match[1]),
    content: raw.slice(match[0].length),
  };
}

async function loadAll<K extends ContentType>(
  type: K,
): Promise<Array<Loaded<Frontmatter[K]>>> {
  const dir = path.join(CONTENT_ROOT, type);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  return Promise.all(
    mdFiles.map((f) => loadFile({ type, slug: f.replace(/\.md$/, "") })),
  );
}

export const loadCastle = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "castles", slug }),
});
export const loadHouse = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "houses", slug }),
});
export const loadCharacter = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "characters", slug }),
});
export const loadEvent = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "events", slug }),
});

export const loadAllCastles = memoize({
  isEnabled,
  load: () => loadAll("castles"),
});
export const loadAllHouses = memoize({
  isEnabled,
  load: () => loadAll("houses"),
});
export const loadAllCharacters = memoize({
  isEnabled,
  load: () => loadAll("characters"),
});
export const loadAllEvents = memoize({
  isEnabled,
  load: () => loadAll("events"),
});

export const loadWeapon = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "weapons", slug }),
});
export const loadDragon = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "dragons", slug }),
});

export const loadAllWeapons = memoize({
  isEnabled,
  load: () => loadAll("weapons"),
});
export const loadAllDragons = memoize({
  isEnabled,
  load: () => loadAll("dragons"),
});

export const loadBattle = memoizeBySlug({
  isEnabled,
  load: (slug: string) => loadFile({ type: "battles", slug }),
});
export const loadAllBattles = memoize({
  isEnabled,
  load: () => loadAll("battles"),
});

export async function renderMarkdown({
  source,
  proseLinks,
}: {
  source: string;
  proseLinks?: ProseLinkIndex;
}): Promise<string> {
  const pipeline = remark();
  if (proseLinks) pipeline.use(remarkProseLinks(proseLinks));
  const processed = await pipeline.use(remarkHtml).process(source);
  return processed.toString();
}
