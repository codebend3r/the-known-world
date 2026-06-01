import type { Metadata, Viewport } from "next";
import {
  Alegreya_Sans,
  Cinzel,
  Cormorant_Unicase,
  EB_Garamond,
} from "next/font/google";
import "../styles/globals.scss";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMenu } from "@/components/SiteMenu";
import { SiteFooter } from "@/components/SiteFooter";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "600", "700"],
});
const cormorantUnicase = Cormorant_Unicase({
  subsets: ["latin"],
  variable: "--font-cormorant-unicase",
  weight: ["500", "600", "700"],
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  weight: ["400", "500", "600"],
});
const alegreyaSans = Alegreya_Sans({
  subsets: ["latin"],
  variable: "--font-alegreya-sans",
  weight: ["400", "500", "700"],
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
      className={`${cinzel.variable} ${cormorantUnicase.variable} ${ebGaramond.variable} ${alegreyaSans.variable}`}
    >
      <body>
        <SiteHeader />
        <SiteMenu />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
