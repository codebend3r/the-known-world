import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "../styles/globals.scss";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMenu } from "@/components/SiteMenu";
import { SiteFooter } from "@/components/SiteFooter";

// Iron Throne v1 uses three faces and three jobs: display sets every title,
// body sets every paragraph, mono sets every label, year, and datum.
//
// The faces are the Google Fonts latin subsets, vendored. `next/font/google`
// fetches them at build time, and Google sometimes answers with
// `/l/font?kit=…&skey=…` URLs whose unescaped `&` breaks Turbopack's font
// resolver and fails the build.
const cormorantGaramond = localFont({
  src: "./fonts/cormorant-garamond-latin-500-700.woff2",
  variable: "--font-cormorant-garamond",
  weight: "500 700",
  adjustFontFallback: "Times New Roman",
});
const spectral = localFont({
  src: [
    {
      path: "./fonts/spectral-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/spectral-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/spectral-latin-300-italic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/spectral-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-spectral",
  adjustFontFallback: "Times New Roman",
});
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-400-500.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 500",
});

export const metadata: Metadata = {
  title: "Atlas of the Known World · A Song of Ice and Fire",
  description:
    "An interactive atlas of George R. R. Martin's world of Ice and Fire: maps, timeline, and the rolls of the great houses.",
};

// No `maximumScale` and no `userScalable: false`: both cap pinch zoom, which
// WCAG 1.4.4 (Resize Text) requires to reach 200%. The map and the family tree
// own their own zoom, and neither needs the page zoom held down to work.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
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
