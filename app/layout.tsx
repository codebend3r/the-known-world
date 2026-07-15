import type { Metadata, Viewport } from "next";
import {
  Barlow_Condensed,
  Girassol,
  Poiret_One,
  Spectral,
} from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "../styles/globals.scss";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMenu } from "@/components/SiteMenu";
import { SiteFooter } from "@/components/SiteFooter";

const girassol = Girassol({
  subsets: ["latin"],
  variable: "--font-girassol",
  weight: "400",
});
const poiretOne = Poiret_One({
  subsets: ["latin"],
  variable: "--font-poiret-one",
  weight: "400",
});
const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Atlas of the Known World · A Song of Ice and Fire",
  description:
    "An interactive atlas of George R. R. Martin's world of Ice and Fire — maps, timeline, and the rolls of the great houses.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${girassol.variable} ${poiretOne.variable} ${spectral.variable} ${barlowCondensed.variable}`}
    >
      <body>
        <SiteHeader />
        <SiteMenu />
        <NuqsAdapter>{children}</NuqsAdapter>
        <SiteFooter />
      </body>
    </html>
  );
}
