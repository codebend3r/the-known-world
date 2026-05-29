import type { Metadata } from 'next';
import { Cinzel, EB_Garamond, Inter } from 'next/font/google';
import '../styles/globals.css';
import '../styles/parchment.css';
import '../styles/site-header.css';
import '../styles/site-menu.css';
import '../styles/map.css';
import '../styles/main-menu.css';
import '../styles/houses.css';
import '../styles/characters.css';
import '../styles/list-search.css';
import '../styles/sigils.css';
import { SiteHeader } from '@/components/SiteHeader';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '600', '700'] });
const ebGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-eb-garamond', weight: ['400', '500', '600'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Atlas of the Known World · A Song of Ice and Fire',
  description: 'An interactive atlas of George R. R. Martin\'s world of Ice and Fire — map, timeline, and encyclopedia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${ebGaramond.variable} ${inter.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
