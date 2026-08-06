import fs from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { parse as parseYaml } from "yaml";
import {
  CastleSchema,
  HouseSchema,
  CharacterSchema,
  EventSchema,
  WeaponSchema,
  DragonSchema,
  BattleSchema,
  type Castle,
  type House,
  type Character,
  type Event,
  type Weapon,
  type Dragon,
  type Battle,
} from "@/lib/schemas";
import { remarkProseLinks, type ProseLinkIndex } from "@/lib/prose-links";
import { memoize, memoizeBySlug } from "@/lib/memoize";

const CONTENT_ROOT = path.join(process.cwd(), "content");

// `output: "export"` renders every page in a worker process, and most pages call
// several `loadAll*`, so without a cache each one re-read and re-validated the
// whole corpus. Enabled only for production builds, where content is immutable:
// `next dev` and tests keep reading from disk so edits show up without a
// restart. Callers must not mutate a returned array, since a hit is shared.
const enabled = process.env.NODE_ENV === "production";

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<T>(
  type:
    | "castles"
    | "houses"
    | "characters"
    | "events"
    | "weapons"
    | "dragons"
    | "battles",
  slug: string,
  schema: { parse: (input: unknown) => T },
): Promise<Loaded<T>> {
  const filePath = path.join(CONTENT_ROOT, type, `${slug}.md`);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = parseFrontmatter(raw);
  const frontmatter = schema.parse(parsed.data);
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

async function loadAll<T>(
  type:
    | "castles"
    | "houses"
    | "characters"
    | "events"
    | "weapons"
    | "dragons"
    | "battles",
  schema: { parse: (input: unknown) => T },
): Promise<Array<Loaded<T>>> {
  const dir = path.join(CONTENT_ROOT, type);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  return Promise.all(
    mdFiles.map((f) => loadFile<T>(type, f.replace(/\.md$/, ""), schema)),
  );
}

export const loadCastle = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<Castle>("castles", slug, CastleSchema),
});
export const loadHouse = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<House>("houses", slug, HouseSchema),
});
export const loadCharacter = memoizeBySlug({
  enabled,
  load: (slug: string) =>
    loadFile<Character>("characters", slug, CharacterSchema),
});
export const loadEvent = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<Event>("events", slug, EventSchema),
});

export const loadAllCastles = memoize({
  enabled,
  load: () => loadAll<Castle>("castles", CastleSchema),
});
export const loadAllHouses = memoize({
  enabled,
  load: () => loadAll<House>("houses", HouseSchema),
});
export const loadAllCharacters = memoize({
  enabled,
  load: () => loadAll<Character>("characters", CharacterSchema),
});
export const loadAllEvents = memoize({
  enabled,
  load: () => loadAll<Event>("events", EventSchema),
});

export const loadWeapon = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<Weapon>("weapons", slug, WeaponSchema),
});
export const loadDragon = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<Dragon>("dragons", slug, DragonSchema),
});

export const loadAllWeapons = memoize({
  enabled,
  load: () => loadAll<Weapon>("weapons", WeaponSchema),
});
export const loadAllDragons = memoize({
  enabled,
  load: () => loadAll<Dragon>("dragons", DragonSchema),
});

export const loadBattle = memoizeBySlug({
  enabled,
  load: (slug: string) => loadFile<Battle>("battles", slug, BattleSchema),
});
export const loadAllBattles = memoize({
  enabled,
  load: () => loadAll<Battle>("battles", BattleSchema),
});

export async function renderMarkdown(
  source: string,
  opts?: { proseLinks?: ProseLinkIndex },
): Promise<string> {
  const pipeline = remark();
  if (opts?.proseLinks) pipeline.use(remarkProseLinks(opts.proseLinks));
  const processed = await pipeline.use(remarkHtml).process(source);
  return processed.toString();
}
