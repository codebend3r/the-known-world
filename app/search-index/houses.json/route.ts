import { loadAllHouses } from "@/lib/content";
import { buildHouseSearchIndex } from "@/lib/search-index";

export const dynamic = "force-static";

export async function GET() {
  const houses = await loadAllHouses();
  return Response.json(buildHouseSearchIndex({ houses }));
}
