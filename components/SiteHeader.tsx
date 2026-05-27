import Link from 'next/link';
import { SiteHeaderNav } from './SiteHeaderNav';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__title-link">
          <p className="site-header__title">The Known World</p>
        </Link>
        <SiteHeaderNav />
      </div>
    </header>
  );
}
