import {
  loadDragon,
  loadAllDragons,
  loadAllHouses,
  loadAllCharacters,
  renderEntryBody,
} from "@/lib/content";
import { slugFromParams, type SlugPageProps } from "@/lib/route-params";
import {
  entryMetadata,
  loadEntryOr404,
  publishedSlugParams,
} from "@/lib/entry-route";
import { EntryPlate } from "@/components/EntryPlate";
import { DragonInfobox } from "@/components/DragonInfobox";
import { houseLabel } from "@/lib/text";
import { bySlug } from "@/lib/collections";

export async function generateStaticParams() {
  return publishedSlugParams({ loadAll: loadAllDragons });
}

export async function generateMetadata({ params }: SlugPageProps) {
  return entryMetadata({
    params,
    load: loadDragon,
    metadata: (dragon) => ({
      title: `${dragon.frontmatter.name} · Atlas of the Known World`,
    }),
  });
}

export default async function DragonPage({ params }: SlugPageProps) {
  const slug = await slugFromParams(params);
  const [dragon, allHouses, allCharacters] = await Promise.all([
    loadEntryOr404({ load: loadDragon, slug }),
    loadAllHouses(),
    loadAllCharacters(),
  ]);

  const housesBySlug = bySlug(allHouses);
  const charactersBySlug = bySlug(allCharacters);

  const fm = dragon.frontmatter;
  const html = await renderEntryBody({
    body: dragon.body,
    current: { kind: "dragon", slug, mentions: fm.mentions },
  });
  const subtitle = fm.house
    ? `Of ${houseLabel({ slug: fm.house, housesBySlug })}`
    : "A wild dragon";

  return (
    <EntryPlate
      layout="sidebar"
      title={fm.name}
      subtitle={subtitle}
      html={html}
      back={{ href: "/dragons/", label: "All Dragons" }}
      sources={fm.sources}
      infobox={({ className }) => (
        <DragonInfobox
          dragon={fm}
          housesBySlug={housesBySlug}
          charactersBySlug={charactersBySlug}
          className={className}
        />
      )}
    />
  );
}
