import Link from 'next/link';
import { SiteMenu } from './SiteMenu';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <SiteMenu />
        <Link href="/" className="site-header__title-link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="site-header__logo"
            width={1360}
            height={1360}
            aria-hidden="true"
          />
          <p className="site-header__title">The Known World</p>
        </Link>
        <span className="site-header__spacer" aria-hidden="true" />
      </div>
    </header>
  );
}
