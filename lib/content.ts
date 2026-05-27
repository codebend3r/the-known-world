import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import { CastleSchema, HouseSchema, CharacterSchema, EventSchema, type Castle, type House, type Character, type Event } from './schemas';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

type Loaded<T> = { frontmatter: T; body: string; slug: string };

async function loadFile<T>(
  type: 'castles' | 'houses' | 'characters' | 'events',
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
  type: 'castles' | 'houses' | 'characters' | 'events',
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

export async function renderMarkdown(source: string): Promise<string> {
  const processed = await remark().use(remarkHtml).process(source);
  return processed.toString();
}
