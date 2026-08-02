import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Spectral } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "../styles/globals.scss";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMenu } from "@/components/SiteMenu";
import { SiteFooter } from "@/components/SiteFooter";

// Iron Throne v1 uses three faces and three jobs: display sets every title,
// body sets every paragraph, mono sets every label, year, and datum.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["500", "600", "700"],
});
const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-spectral",
  weight: ["300", "400"],
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atlas of the Known World · A Song of Ice and Fire",
  description:
    "An interactive atlas of George R. R. Martin's world of Ice and Fire: maps, timeline, and the rolls of the great houses.",
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
      className={`${cormorantGaramond.variable} ${spectral.variable} ${jetbrainsMono.variable}`}
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
