import Link from 'next/link';
import { SiteHeaderNav } from './SiteHeaderNav';
import { HeaderSearch } from './HeaderSearch';
import type { SearchEntry } from '@/lib/search-index';

type Props = { searchEntries?: SearchEntry[] };

export function SiteHeader({ searchEntries = [] }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__title-link">
          <p className="site-header__title">The Known World</p>
        </Link>
        <SiteHeaderNav />
        <HeaderSearch entries={searchEntries} />
      </div>
    </header>
  );
}
