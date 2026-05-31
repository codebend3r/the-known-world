import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import {
  CastleSchema, HouseSchema, CharacterSchema, EventSchema,
  WeaponSchema, DragonSchema,
  type Castle, type House, type Character, type Event,
  type Weapon, type Dragon,
} from '@/lib/schemas';
import { remarkProseLinks, type ProseLinkIndex } from '@/lib/prose-links';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<T>(
  type: 'castles' | 'houses' | 'characters' | 'events' | 'weapons' | 'dragons',
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
  type: 'castles' | 'houses' | 'characters' | 'events' | 'weapons' | 'dragons',
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
export const loadCharacter = (slug: string) => loadFile<Character>('characters', slug, CharacterSchema);
export const loadEvent = (slug: string) => loadFile<Event>('events', slug, EventSchema);

export const loadAllCastles = () => loadAll<Castle>('castles', CastleSchema);
export const loadAllHouses = () => loadAll<House>('houses', HouseSchema);
export const loadAllCharacters = () => loadAll<Character>('characters', CharacterSchema);
export const loadAllEvents = () => loadAll<Event>('events', EventSchema);

export const loadWeapon = (slug: string) => loadFile<Weapon>('weapons', slug, WeaponSchema);
export const loadDragon = (slug: string) => loadFile<Dragon>('dragons', slug, DragonSchema);

export const loadAllWeapons = () => loadAll<Weapon>('weapons', WeaponSchema);
export const loadAllDragons = () => loadAll<Dragon>('dragons', DragonSchema);

export async function renderMarkdown(
  source: string,
  opts?: { proseLinks?: ProseLinkIndex },
): Promise<string> {
  const pipeline = remark();
  if (opts?.proseLinks) pipeline.use(remarkProseLinks(opts.proseLinks));
  const processed = await pipeline.use(remarkHtml).process(source);
  return processed.toString();
}
