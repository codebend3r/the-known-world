import { Suspense } from "react";
import type { Metadata } from "next";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { sectionGlyphs } from "@/components/SectionGlyphs";
import { WorldMap, WorldMapSkeleton } from "@/components/WorldMap";

export const metadata: Metadata = {
  title: "Maps · Atlas of the Known World",
  description: "An interactive map of the Known World.",
};

export default function MapsPage() {
  return (
    <PlateLayout>
      <PageHeading
        title="Maps"
        eyebrow="Collection 01"
        icon={sectionGlyphs.maps}
        subtitle="The Known World, from the Sunset Sea to the Shadow Lands."
      />
      <Suspense fallback={<WorldMapSkeleton />}>
        <WorldMap
          src="/map/the-known-world-enhanced.jpg"
          naturalWidth={10000}
          naturalHeight={8300}
        />
      </Suspense>
    </PlateLayout>
  );
}
