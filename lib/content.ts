import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
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

const CONTENT_ROOT = path.join(process.cwd(), "content");

// Bounds concurrent open file descriptors during static generation; an
// unbounded Promise.all across ~1500 files per render overflows the OS
// file table (ENFILE) when many pages prerender at once.
const READ_CHUNK_SIZE = 64;

type ContentType =
  | "castles"
  | "houses"
  | "characters"
  | "events"
  | "weapons"
  | "dragons"
  | "battles";

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<T>(
  type: ContentType,
  slug: string,
  schema: { parse: (input: unknown) => T },
): Promise<Loaded<T>> {
  const filePath = path.join(CONTENT_ROOT, type, `${slug}.md`);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = matter(raw);
  const frontmatter = schema.parse(parsed.data);
  return { frontmatter, body: parsed.content, slug };
}

async function loadAll<T>(
  type: ContentType,
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
  const chunks = mdFiles.reduce<string[][]>((acc, file, index) => {
    if (index % READ_CHUNK_SIZE === 0) return [...acc, [file]];
    return [...acc.slice(0, -1), [...(acc.at(-1) ?? []), file]];
  }, []);
  return chunks.reduce<Promise<Array<Loaded<T>>>>(async (accPromise, chunk) => {
    const acc = await accPromise;
    const loaded = await Promise.all(
      chunk.map((f) => loadFile<T>(type, f.replace(/\.md$/, ""), schema)),
    );
    return [...acc, ...loaded];
  }, Promise.resolve([]));
}

// Memoizes the in-flight promise so every page prerendered by a worker
// shares one read of each content directory instead of re-opening every
// file per page. Bypassed in dev so content edits show up on refresh.
function createLoadAll<T>(
  type: ContentType,
  schema: { parse: (input: unknown) => T },
): () => Promise<Array<Loaded<T>>> {
  let cache: Promise<Array<Loaded<T>>> | null = null;
  return () => {
    if (process.env.NODE_ENV === "development") return loadAll(type, schema);
    cache ??= loadAll(type, schema);
    return cache;
  };
}

export const loadCastle = (slug: string) =>
  loadFile<Castle>("castles", slug, CastleSchema);
export const loadHouse = (slug: string) =>
  loadFile<House>("houses", slug, HouseSchema);
export const loadCharacter = (slug: string) =>
  loadFile<Character>("characters", slug, CharacterSchema);
export const loadEvent = (slug: string) =>
  loadFile<Event>("events", slug, EventSchema);

export const loadAllCastles = createLoadAll<Castle>("castles", CastleSchema);
export const loadAllHouses = createLoadAll<House>("houses", HouseSchema);
export const loadAllCharacters = createLoadAll<Character>(
  "characters",
  CharacterSchema,
);
export const loadAllEvents = createLoadAll<Event>("events", EventSchema);

export const loadWeapon = (slug: string) =>
  loadFile<Weapon>("weapons", slug, WeaponSchema);
export const loadDragon = (slug: string) =>
  loadFile<Dragon>("dragons", slug, DragonSchema);

export const loadAllWeapons = createLoadAll<Weapon>("weapons", WeaponSchema);
export const loadAllDragons = createLoadAll<Dragon>("dragons", DragonSchema);

export const loadBattle = (slug: string) =>
  loadFile<Battle>("battles", slug, BattleSchema);
export const loadAllBattles = createLoadAll<Battle>("battles", BattleSchema);

export async function renderMarkdown(
  source: string,
  opts?: { proseLinks?: ProseLinkIndex },
): Promise<string> {
  const pipeline = remark();
  if (opts?.proseLinks) pipeline.use(remarkProseLinks(opts.proseLinks));
  const processed = await pipeline.use(remarkHtml).process(source);
  return processed.toString();
}
