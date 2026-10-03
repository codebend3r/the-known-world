import { loadAllCharacters } from "@/lib/content";
import { buildCharacterSearchIndex } from "@/lib/search-index";

export const dynamic = "force-static";

export async function GET() {
  const characters = await loadAllCharacters();
  return Response.json(
    buildCharacterSearchIndex({
      characters: characters.map((character) => character.frontmatter),
    }),
  );
}
