import type { Metadata, Viewport } from "next";
import { Bevan, Graduate, Old_Standard_TT, Oswald } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "../styles/globals.scss";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteMenu } from "@/components/SiteMenu";
import { SiteFooter } from "@/components/SiteFooter";

const bevan = Bevan({
  subsets: ["latin"],
  variable: "--font-bevan",
  weight: "400",
});
const graduate = Graduate({
  subsets: ["latin"],
  variable: "--font-graduate",
  weight: "400",
});
const oldStandard = Old_Standard_TT({
  subsets: ["latin"],
  variable: "--font-old-standard",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
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
      className={`${bevan.variable} ${graduate.variable} ${oldStandard.variable} ${oswald.variable}`}
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
