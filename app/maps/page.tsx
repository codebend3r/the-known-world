import { Suspense } from "react";
import type { Metadata } from "next";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs/SectionGlyphs";
import { WorldMap, WorldMapSkeleton } from "@/components/WorldMap";

export const metadata: Metadata = {
  title: "Maps · Atlas of the Known World",
  description: "An interactive map of the Known World.",
};

export default function MapsPage() {
  return (
    <ParchmentLayout>
      <PageHeading
        title="Maps"
        icon={sectionGlyphs.maps}
        subtitle="The Known World, from the Sunset Sea to the Shadow Lands."
      />
      <Suspense fallback={<WorldMapSkeleton />}>
        <WorldMap
          src="/map/map_natural_8K.jpg"
          naturalWidth={7680}
          naturalHeight={7680}
        />
      </Suspense>
    </ParchmentLayout>
  );
}
