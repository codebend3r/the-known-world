import { Suspense } from "react";
import type { Metadata } from "next";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs";
import { WorldMap, WorldMapSkeleton } from "@/components/WorldMap";
import { loadAllCastles, loadAllHouses } from "@/lib/content";
import { WORLD_MAP_RASTER, selectWorldMapMarkers } from "@/lib/map";

export const metadata: Metadata = {
  title: "Maps · Atlas of the Known World",
  description: "An interactive map of the Known World.",
};

export default async function MapsPage() {
  const [castles, houses] = await Promise.all([
    loadAllCastles(),
    loadAllHouses(),
  ]);
  const markers = selectWorldMapMarkers({ castles, houses });
  return (
    <PlateLayout>
      <PageHeading
        title="Maps"
        eyebrow="Collection 01"
        icon={sectionGlyphs.maps}
        filigree="scale"
        subtitle="The Known World, from the Sunset Sea to the Shadow Lands."
      />
      <Suspense fallback={<WorldMapSkeleton />}>
        <WorldMap
          src={WORLD_MAP_RASTER.src}
          naturalWidth={WORLD_MAP_RASTER.width}
          naturalHeight={WORLD_MAP_RASTER.height}
          markers={markers}
        />
      </Suspense>
    </PlateLayout>
  );
}
