import type { Metadata } from "next";
import { PlateLayout } from "@/components/PlateLayout";
import { PageHeading } from "@/components/PageHeading";
import { loadDesignTokens } from "@/lib/design-tokens";
import { CorePalette } from "@/app/design/_sections/CorePalette";
import { HeraldicColour } from "@/app/design/_sections/HeraldicColour";
import { Typography } from "@/app/design/_sections/Typography";
import { ComponentKit } from "@/app/design/_sections/ComponentKit";
import { StructureRules } from "@/app/design/_sections/StructureRules";
import { TokenSource } from "@/app/design/_sections/TokenSource";
import { PageIndex } from "@/app/design/_sections/PageIndex";

export const metadata: Metadata = {
  title: "Design System · Atlas of the Known World",
  description:
    "Iron Throne v1: the tokens, type, and components of the Known World, on a forge-black ground with one molten-gold accent.",
};

// The in-repo catalogue of Iron Throne v1. Colour values, type specs, and the
// token listing are read from `styles/globals.scss` at build time, so a retuned
// token shows up here without an edit and a renamed one fails the build. Only
// names, uses, and samples live in the section files.

export default async function DesignPage() {
  const tokens = await loadDesignTokens();

  return (
    <PlateLayout>
      <PageHeading
        title="The Iron Throne System"
        eyebrow="Design system · Iron Throne v1"
        subtitle="Tokens, type, and components for The Known World. Forge-black ground, molten gold, heraldic house colour. Every value below is declared in styles/globals.scss."
      />
      <CorePalette tokens={tokens} />
      <HeraldicColour />
      <Typography tokens={tokens} />
      <ComponentKit />
      <StructureRules />
      <TokenSource tokens={tokens} />
      <PageIndex />
    </PlateLayout>
  );
}
