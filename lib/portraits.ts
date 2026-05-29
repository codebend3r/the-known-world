import fs from 'node:fs/promises';
import path from 'node:path';
import type { Character } from './schemas';

const PORTRAIT_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg'] as const;

export async function findPortrait(
  slug: string,
  sex: Character['sex'],
): Promise<string> {
  for (const ext of PORTRAIT_EXTENSIONS) {
    const absPath = path.join(process.cwd(), 'public', 'characters', `${slug}.${ext}`);
    try {
      await fs.access(absPath);
      return `/characters/${slug}.${ext}`;
    } catch {
      // not found; try the next extension
    }
  }
  return sex === 'f' ? '/characters/unknown-female.png' : '/characters/unknown-male.png';
}
