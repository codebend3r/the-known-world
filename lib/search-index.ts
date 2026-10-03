import * as z from "zod/mini";
import type { Character, House } from "@/lib/schemas";
import { bySlug, compareByName } from "@/lib/collections";
import { regionForHouse, regionLabel } from "@/lib/regions";
import { shortHouseName } from "@/lib/text";

// The jump-to-entry fields on the character and house plates fetch these
// indexes as static JSON on first hover or focus (see `lib/useSearchIndex`).
// Inlined as props they rode along in every detail page's HTML and RSC
// payload — ~77 KB per character page.
//
// `zod/mini` rather than `zod`: this runs in the browser, and the full build
// would outweigh the payload it validates.
export const searchIndexItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  // The muted parenthetical beside the name: an alias, a region, a byname.
  detail: z.nullable(z.string()),
  aliases: z.array(z.string()),
});

export type SearchIndexItem = z.infer<typeof searchIndexItemSchema>;

const searchIndexSchema = z.array(searchIndexItemSchema);

export function buildCharacterSearchIndex({
  characters,
}: {
  characters: readonly Character[];
}): SearchIndexItem[] {
  return characters
    .filter((character) => !character.draft && !character.placeholder)
    .map((character) => ({
      slug: character.slug,
      name: character.name,
      detail: character.aliases[0] ?? null,
      aliases: character.aliases,
    }));
}

export function buildHouseSearchIndex({
  houses,
}: {
  houses: readonly { slug: string; frontmatter: House }[];
}): SearchIndexItem[] {
  const housesBySlug = bySlug(houses);
  return houses
    .map((house) => house.frontmatter)
    .filter((house) => !house.draft)
    .map((house) => ({
      slug: house.slug,
      name: shortHouseName(house.name),
      detail: regionLabel(regionForHouse(house.slug, housesBySlug)),
      aliases: [],
    }))
    .toSorted(compareByName);
}

const requests = new Map<string, Promise<SearchIndexItem[]>>();

async function requestSearchIndex(url: string): Promise<SearchIndexItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Search index ${url} responded ${response.status}`);
  }
  return searchIndexSchema.parse(await response.json());
}

// Shared across mounts so a client-side hop between two character plates
// reuses the first fetch. A failure is evicted so the next focus can retry.
export function fetchSearchIndex(url: string): Promise<SearchIndexItem[]> {
  const cached = requests.get(url);
  if (cached) return cached;
  const pending = requestSearchIndex(url).catch((error: unknown) => {
    requests.delete(url);
    throw error;
  });
  requests.set(url, pending);
  return pending;
}
